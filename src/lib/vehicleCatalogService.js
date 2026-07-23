import { supabase } from './supabaseClient';

const ensureSupabase = () => {
  if (!supabase) throw new Error('Supabase não está configurado.');
};

export const catalogType = (vehicleType) => vehicleType === 'bus' ? 'truck' : vehicleType;

export const vehicleCatalogService = {
  async getBrands(vehicleType) {
    ensureSupabase();
    const { data, error } = await supabase
      .from('vehicle_brands')
      .select('id, name, vehicle_type')
      .eq('vehicle_type', catalogType(vehicleType))
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getModels(brandId) {
    ensureSupabase();
    const { data, error } = await supabase
      .from('vehicle_models')
      .select('id, name, fipe_code')
      .eq('brand_id', brandId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getYears(modelId) {
    ensureSupabase();
    const { data, error } = await supabase
      .from('vehicle_years')
      .select('id, year, fuel, fuel_code, zero_km')
      .eq('model_id', modelId)
      .order('year', { ascending: false })
      .order('fuel');
    if (error) throw error;
    return data || [];
  },

  async getModelIdsByYear(modelIds, year) {
    ensureSupabase();
    if (!Array.isArray(modelIds) || modelIds.length === 0 || !/^\d{4}$/.test(String(year))) return [];
    const { data, error } = await supabase
      .from('vehicle_years')
      .select('model_id')
      .in('model_id', modelIds)
      .eq('year', Number(year));
    if (error) throw error;
    return [...new Set((data || []).map(item => item.model_id))];
  },
};
