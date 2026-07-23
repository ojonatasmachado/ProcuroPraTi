import { supabase } from '@/lib/supabaseClient';

const cache = new Map();

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const catalogKey = (vehicleType) => vehicleType || 'all';

export const getPartCatalogSuggestions = async (vehicleType, fallbackNames = []) => {
  const key = catalogKey(vehicleType);
  if (cache.has(key)) return cache.get(key);

  const fallback = [...new Set(fallbackNames)]
    .filter(Boolean)
    .map(name => ({ label: name, value: name, keywords: name }));

  if (!supabase) return fallback;

  try {
    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from('part_catalog')
        .select('name,aliases,vehicle_types')
        .eq('active', true)
        .eq('is_searchable', true)
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1);
      if (vehicleType) query = query.contains('vehicle_types', [vehicleType]);

      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }

    const suggestionsByName = new Map();
    [...rows, ...fallback.map(item => ({ name: item.label, aliases: [] }))].forEach(row => {
      const name = String(row.name || '').trim();
      if (!name) return;
      const normalizedName = normalize(name);
      const aliases = Array.isArray(row.aliases) ? row.aliases.filter(Boolean) : [];
      const current = suggestionsByName.get(normalizedName);
      const mergedAliases = [...new Set([...(current?.aliases || []), ...aliases])];
      suggestionsByName.set(normalizedName, {
        label: current?.label || name,
        value: current?.value || name,
        aliases: mergedAliases,
        keywords: [name, ...mergedAliases].join(' '),
      });
    });

    const suggestions = [...suggestionsByName.values()]
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    cache.set(key, suggestions);
    return suggestions;
  } catch (error) {
    console.warn('Não foi possível carregar o catálogo de peças; usando a lista local.', error);
    return fallback;
  }
};

export const clearPartCatalogCache = () => cache.clear();
