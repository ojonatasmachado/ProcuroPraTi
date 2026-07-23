import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';

const CATALOG_URL = 'https://api.mercadolibre.com/sites/MLB/categories/all';
const VEHICLE_ROOT_ID = 'MLB5672';
const SOURCE = 'mercado_livre_brasil';
const CURATED_SOURCE = 'procuro_pra_ti';
const ALL_VEHICLE_TYPES = ['car', 'motorcycle', 'truck', 'bus'];

const excludedBranches = new Set([
  'MLB6005', // Acessórios náuticos
  'MLB456046', // Peças náuticas
  'MLB457400', // Instalações de pneus
  'MLB458209', // Anúncios de motos
  'MLB377674', // Serviços programados
  'MLB455216', // Tags de pedágio
]);

const nonSearchableNames = new Set([
  'acessórios para veículos',
  'outro',
  'outros',
  'outras',
  'peças',
  'acessórios',
  'kits',
  'kit',
]);

const highValuePattern = /\b(motor|cambio|câmbio|transmiss|cabecote|cabeçote|bloco|virabrequim|comando de valvula|comando de válvula|turbo|turbina|diferencial|eixo|modulo|módulo|central|ecu|carroceria|cabine|chassi|bomba injetora|injecao|injeção|caixa de direcao|caixa de direção|compressor|catalisador|air bag|airbag|bateria hibrida|bateria híbrida)\b/i;

const aliasMap = new Map(Object.entries({
  'Bomba de Água': ['Bomba d’Água', "Bomba d'Água"],
  'Motor de Partida': ['Motor de Arranque', 'Arranque'],
  'Junta Homocinética': ['Homocinética'],
  'Unidade de Controle do Motor': ['Módulo de Injeção', 'ECU', 'Central de Injeção'],
  'Corpo de Borboleta': ['TBI', 'Corpo de Borboleta TBI'],
  'Servo Freio': ['Hidrovácuo', 'Hidro Vácuo'],
  'Para-choques': ['Parachoque', 'Para-choque'],
  'Para-lamas': ['Paralama', 'Para-lama'],
  'Para-brisas': ['Parabrisa', 'Para-brisa'],
  'Limpadores de Para-brisa': ['Palheta do Limpador', 'Palheta'],
  'Rolamentos de Roda': ['Rolamento da Roda', 'Cubo de Roda'],
  'Terminais de Direção': ['Terminal de Direção'],
  'Bieletas': ['Bieleta da Suspensão'],
  'Bandejas de Suspensão': ['Bandeja', 'Balança da Suspensão'],
  'Buchas de Suspensão': ['Bucha da Bandeja', 'Bucha da Suspensão'],
  'Velas de Ignição': ['Vela'],
  'Cabos de Vela': ['Cabo de Ignição'],
  'Bicos Injetores': ['Injetor de Combustível', 'Bico de Injeção'],
  'Bobinas de Ignição': ['Bobina'],
  'Sondas Lambda': ['Sensor de Oxigênio', 'Sonda Lambda'],
  'Correias Dentadas': ['Correia de Comando', 'Correia Sincronizadora'],
  'Kit de Embreagem': ['Embreagem'],
  'Discos de Freio': ['Disco de Freio'],
  'Pastilhas de Freio': ['Pastilha de Freio'],
  'Sapatas de Freio': ['Sapata de Freio'],
  'Cilindros Mestre': ['Cilindro Mestre'],
  'Amortecedores': ['Amortecedor'],
  'Alternadores': ['Alternador'],
  'Radiadores': ['Radiador'],
  'Condensadores': ['Condensador do Ar-condicionado'],
  'Compressores de Ar Condicionado': ['Compressor do Ar', 'Compressor do Ar-condicionado'],
  'Ventoinhas': ['Eletroventilador', 'Ventoinha do Radiador'],
  'Faróis': ['Farol'],
  'Lanternas Traseiras': ['Lanterna'],
  'Retrovisores': ['Espelho Retrovisor'],
}));

const contextualModifiers = /^(?:(?:de|do|da|dos|das|para)\s+.+|dianteir[oa]s?|traseir[oa]s?|direit[oa]s?|esquerd[oa]s?|superior(?:es)?|inferior(?:es)?|intern[oa]s?|extern[oa]s?|principais?|manuais?|autom[aá]tic[oa]s?|el[eé]tric[oa]s?|eletr[oô]nic[oa]s?|mec[aâ]nic[oa]s?|hidr[aá]ulic[oa]s?)$/i;

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const categoryVehicleTypes = (category) => {
  const ids = new Set((category.path_from_root || []).map(item => item.id));
  if (ids.has('MLB1771') || ids.has('MLB243551')) return ['motorcycle'];
  if (ids.has('MLB438364') || ids.has('MLB419936')) return ['truck', 'bus'];
  if (ids.has('MLB1747') || ids.has('MLB22693')) return ['car'];
  return ALL_VEHICLE_TYPES;
};

const isExcluded = (category) => {
  const ids = new Set((category.path_from_root || []).map(item => item.id));
  return [...excludedBranches].some(id => ids.has(id));
};

const sourceUpdatedAt = (headers) => {
  const value = headers.get('x-content-created') || headers.get('last-modified');
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const displayNameForCategory = (category) => {
  const originalName = String(category.name || '').trim();
  const path = category.path_from_root || [];
  const parentName = String(path.at(-2)?.name || '').trim();
  if (!parentName || !contextualModifiers.test(originalName)) return originalName;
  return `${parentName} ${originalName.charAt(0).toLowerCase()}${originalName.slice(1)}`;
};

const buildRows = (dump, updatedAt) => Object.values(dump)
  .filter(category => category.path_from_root?.[0]?.id === VEHICLE_ROOT_ID)
  .filter(category => !isExcluded(category))
  .map(category => {
    const path = category.path_from_root.map(item => String(item.name || '').trim()).filter(Boolean);
    const sourceName = String(category.name || '').trim();
    const name = displayNameForCategory(category);
    const normalizedName = normalize(name);
    const isLeaf = !Array.isArray(category.children_categories) || category.children_categories.length === 0;
    const isGeneric = nonSearchableNames.has(normalizedName);
    return {
      source: SOURCE,
      source_id: category.id,
      name,
      normalized_name: normalizedName,
      category_name: path[1] || path[0] || null,
      category_path: path,
      aliases: [...new Set([
        ...(aliasMap.get(name) || []),
        ...(sourceName !== name ? [sourceName] : []),
      ])],
      vehicle_types: categoryVehicleTypes(category),
      is_high_value: highValuePattern.test(`${name} ${path.join(' ')}`),
      is_searchable: isLeaf && !isGeneric,
      active: true,
      source_updated_at: updatedAt,
      updated_at: new Date().toISOString(),
    };
  })
  .filter(row => row.name && row.normalized_name);

const readCuratedRows = async () => {
  const source = await fs.readFile(new URL('../src/lib/referenceData.js', import.meta.url), 'utf8');
  const match = source.match(/partNames:\s*\[([\s\S]*?)\]\.sort\(/);
  if (!match) throw new Error('Não foi possível localizar a lista local de peças.');
  const names = Function(`"use strict"; return [${match[1]}];`)();
  return [...new Set(names)].map((name, index) => {
    const vehicleTypes = name.includes('(Moto)')
      ? ['motorcycle']
      : name.includes('(Caminhão)')
        ? ['truck', 'bus']
        : ALL_VEHICLE_TYPES;
    return {
      source: CURATED_SOURCE,
      source_id: `legacy-${index + 1}`,
      name,
      normalized_name: normalize(name),
      category_name: 'Catálogo Procuro Pra Ti',
      category_path: ['Catálogo Procuro Pra Ti', name],
      aliases: aliasMap.get(name) || [],
      vehicle_types: vehicleTypes,
      is_high_value: highValuePattern.test(name),
      is_searchable: normalize(name) !== 'outra peca',
      active: true,
      source_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
};

const batch = (items, size) => {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
};

const main = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  }

  console.log('Baixando a taxonomia brasileira de autopeças...');
  const response = await fetch(CATALOG_URL, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'ProcuroPraTi-CatalogSync/1.0',
    },
  });
  if (!response.ok) throw new Error(`Falha ao baixar catálogo: HTTP ${response.status}`);

  const dump = await response.json();
  const updatedAt = sourceUpdatedAt(response.headers);
  const publicRows = buildRows(dump, updatedAt);
  const curatedRows = await readCuratedRows();
  let rows = [...publicRows, ...curatedRows];
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: lockedRows, error: lockedRowsError } = await client
    .from('part_catalog')
    .select('source,source_id')
    .eq('admin_locked', true);
  if (lockedRowsError) throw lockedRowsError;
  const lockedKeys = new Set((lockedRows || []).map(row => `${row.source}:${row.source_id}`));
  rows = rows.filter(row => !lockedKeys.has(`${row.source}:${row.source_id}`));
  const searchable = rows.filter(row => row.is_searchable).length;

  const { error: deactivateError } = await client
    .from('part_catalog')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('source', SOURCE)
    .eq('admin_locked', false);
  if (deactivateError) throw deactivateError;
  const { error: deactivateCuratedError } = await client
    .from('part_catalog')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('source', CURATED_SOURCE)
    .eq('admin_locked', false);
  if (deactivateCuratedError) throw deactivateCuratedError;

  let imported = 0;
  for (const group of batch(rows, 400)) {
    const { error } = await client
      .from('part_catalog')
      .upsert(group, { onConflict: 'source,source_id' });
    if (error) throw error;
    imported += group.length;
    console.log(`Importados ${imported}/${rows.length}`);
  }

  const { error: syncError } = await client.from('part_catalog_syncs').insert({
    source: SOURCE,
    source_created_at: updatedAt,
    records_seen: Object.keys(dump).length,
    records_imported: publicRows.length,
    searchable_records: searchable,
  });
  if (syncError) throw syncError;

  console.log(JSON.stringify({
    source: SOURCE,
    sourceUpdatedAt: updatedAt,
    totalCategoriesInSource: Object.keys(dump).length,
    automotiveRecordsImported: publicRows.length,
    curatedRecordsImported: curatedRows.length,
    totalRecordsImported: rows.length,
    searchablePartsAndAccessories: searchable,
  }, null, 2));
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
