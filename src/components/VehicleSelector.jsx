import React, { useEffect, useState } from 'react';
import { Car, Bike, Truck, Bus, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { vehicleCatalogService } from '@/lib/vehicleCatalogService';
import CityCombobox from '@/components/CityCombobox';

export const EMPTY_VEHICLE = {
  type: '', brandId: '', brandName: '', modelId: '', modelName: '',
  yearId: '', year: '', fuel: '', fipeCode: '',
};

const FIRST_YEAR = 1900;
const modelManualValue = (name) => `manual-model:${name}`;

const VehicleSelector = ({ value = EMPTY_VEHICLE, onChange, idPrefix = 'vehicle', yearRequired = false }) => {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [modelIdsForYear, setModelIdsForYear] = useState(null);
  const [isFilteringModels, setIsFilteringModels] = useState(false);

  useEffect(() => {
    let active = true;
    setBrands([]); setModels([]); setYears([]); setError(''); setModelIdsForYear(null);
    if (!value.type) return () => { active = false; };
    setLoading('brands');
    vehicleCatalogService.getBrands(value.type === 'bus' ? 'truck' : value.type)
      .then(rows => { if (active) setBrands(rows); })
      .catch(() => { if (active) setError('Não foi possível carregar as marcas.'); })
      .finally(() => { if (active) setLoading(''); });
    return () => { active = false; };
  }, [value.type]);

  useEffect(() => {
    let active = true;
    setModels([]); setYears([]); setError(''); setModelIdsForYear(null);
    if (!value.brandId) return () => { active = false; };
    setLoading('models');
    vehicleCatalogService.getModels(value.brandId)
      .then(rows => { if (active) setModels(rows); })
      .catch(() => { if (active) setError('Não foi possível carregar os modelos.'); })
      .finally(() => { if (active) setLoading(''); });
    return () => { active = false; };
  }, [value.brandId]);

  useEffect(() => {
    const desiredYear = String(value.year || '');
    if (!/^\d{4}$/.test(desiredYear) || models.length === 0) {
      setModelIdsForYear(null);
      return undefined;
    }
    let active = true;
    setIsFilteringModels(true);
    vehicleCatalogService.getModelIdsByYear(models.map(model => model.id), desiredYear)
      .then(ids => { if (active) setModelIdsForYear(new Set(ids)); })
      .catch(() => { if (active) setModelIdsForYear(null); })
      .finally(() => { if (active) setIsFilteringModels(false); });
    return () => { active = false; };
  }, [value.year, models]);

  useEffect(() => {
    let active = true;
    setYears([]); setError('');
    if (!value.modelId) return () => { active = false; };
    setLoading('years');
    vehicleCatalogService.getYears(value.modelId)
      .then(rows => { if (active) setYears(rows); })
      .catch(() => { if (active) setError('Não foi possível carregar os anos.'); })
      .finally(() => { if (active) setLoading(''); });
    return () => { active = false; };
  }, [value.modelId]);

  useEffect(() => {
    if (!value.modelId || value.yearId || !value.year || years.length === 0) return;
    const matchingYear = years.find(item => String(item.year) === String(value.year));
    if (matchingYear) onChange({ ...value, yearId: matchingYear.id, fuel: matchingYear.fuel || '' });
  }, [value, years, onChange]);

  const changeType = type => onChange({ ...EMPTY_VEHICLE, type });
  const changeYear = (yearValue) => onChange({ ...value, yearId: '', year: yearValue.replace('manual:', ''), fuel: '' });
  const changeBrand = (brandId) => {
    const brand = brands.find(item => item.id === brandId);
    onChange({ ...EMPTY_VEHICLE, type: value.type, year: value.year, brandId, brandName: brand?.name || '' });
  };
  const changeModel = (modelId) => {
    if (modelId.startsWith('manual-model:')) {
      useManualModel(modelId.replace('manual-model:', ''));
      return;
    }
    const model = models.find(item => item.id === modelId);
    onChange({ ...value, modelId, modelName: model?.name || '', fipeCode: model?.fipe_code || '', yearId: '', fuel: '' });
  };
  const useManualModel = (modelName) => onChange({ ...value, modelId: '', modelName, fipeCode: '', yearId: '', fuel: '' });

  const brandOptions = brands.map(brand => ({ value: brand.id, label: brand.name }));
  const compatibleModels = modelIdsForYear instanceof Set && modelIdsForYear.size > 0
    ? models.filter(model => modelIdsForYear.has(model.id))
    : models;
  const modelOptions = [
    ...compatibleModels.map(model => {
      const isNewFiesta = value.brandName === 'Ford' && /fiesta/i.test(model.name) && /(16v|\bse\b|titanium|tit\.)/i.test(model.name);
      return { value: model.id, label: model.name, searchText: isNewFiesta ? 'New Fiesta Novo Fiesta' : '', description: isNewFiesta ? 'Também conhecido como New Fiesta' : '' };
    }),
    ...(value.modelName && !value.modelId ? [{ value: modelManualValue(value.modelName), label: value.modelName, description: 'Modelo informado manualmente.' }] : []),
  ];
  const currentYear = new Date().getFullYear() + 1;
  const yearOptions = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => currentYear - index)
    .map(year => ({ value: `manual:${year}`, label: String(year), searchText: String(year) }));

  const trigger = (id, placeholder, disabled) => (
    <SelectTrigger id={id} className="w-full bg-input text-sm" disabled={disabled}><SelectValue placeholder={placeholder} /></SelectTrigger>
  );

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${idPrefix}-type`} className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Tipo de veículo *</Label>
        <Select value={value.type} onValueChange={changeType}>
          {trigger(`${idPrefix}-type`, 'Selecione o tipo', false)}
          <SelectContent className="max-h-60 bg-popover text-popover-foreground">
            <SelectItem value="car"><Car className="mr-2 inline-block h-4 w-4" />Carro</SelectItem>
            <SelectItem value="motorcycle"><Bike className="mr-2 inline-block h-4 w-4" />Moto</SelectItem>
            <SelectItem value="truck"><Truck className="mr-2 inline-block h-4 w-4" />Caminhão</SelectItem>
            <SelectItem value="bus"><Bus className="mr-2 inline-block h-4 w-4" />Ônibus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <Label htmlFor={`${idPrefix}-year`} className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Ano{yearRequired ? ' *' : ''}</Label>
          <CityCombobox id={`${idPrefix}-year`} value={value.year ? `manual:${value.year}` : ''} onChange={changeYear} options={yearOptions} disabled={!value.type} placeholder="Selecione ou pesquise" searchPlaceholder="Digite o ano, por exemplo 2012" maxResults={500} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-brand`} className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Marca *</Label>
          <CityCombobox id={`${idPrefix}-brand`} value={value.brandId} onChange={changeBrand} options={brandOptions} disabled={!value.type || loading === 'brands'} placeholder={loading === 'brands' ? 'Carregando...' : 'Selecione ou pesquise'} searchPlaceholder="Digite a marca" maxResults={500} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-model`} className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Modelo *</Label>
          <CityCombobox id={`${idPrefix}-model`} value={value.modelId || (value.modelName ? modelManualValue(value.modelName) : '')} onChange={changeModel} options={modelOptions} disabled={!value.brandId || loading === 'models'} placeholder={loading === 'models' ? 'Carregando...' : 'Selecione ou pesquise'} searchPlaceholder="Digite modelo ou versão" maxResults={500} onCreate={useManualModel} createLabel={name => `Usar “${name}” como modelo manual`} />
        </div>
      </div>

      <details open className="rounded-xl border border-border bg-input/30 p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground"><SlidersHorizontal className="h-4 w-4 text-primary" />Busca avançada</summary>
        <div className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Escolha primeiro o ano. Em seguida, pesquise marca e modelo ou versão. Se o modelo não existir no catálogo, escreva o nome completo e escolha a opção para salvá-lo manualmente.</div>
        {isFilteringModels && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Filtrando versões compatíveis com {value.year}...</p>}
        {value.year && !isFilteringModels && modelIdsForYear?.size > 0 && <p className="mt-2 text-xs text-accent-agile">{modelIdsForYear.size} versão(ões) compatível(is) encontradas para {value.year}.</p>}
        {value.year && !isFilteringModels && modelIdsForYear?.size === 0 && <p className="mt-2 text-xs text-warning">Não encontramos uma versão FIPE para {value.year}. Você ainda pode informar o modelo manualmente.</p>}
      </details>
      {(loading || error) && <p className={`flex items-center gap-1 text-xs ${error ? 'text-danger' : 'text-muted-foreground'}`}>{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{error || 'Consultando catálogo FIPE...'}</p>}
    </div>
  );
};

export default VehicleSelector;
