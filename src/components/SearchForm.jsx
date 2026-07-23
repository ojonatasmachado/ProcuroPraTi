
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MapPin, Camera, PackagePlus, CalendarDays, ArrowLeft, Upload, X, Loader2, Car } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import AutocompleteInput from '@/components/AutocompleteInput'; 
import { Slider } from "@/components/ui/slider";
import VehicleSelector, { EMPTY_VEHICLE } from '@/components/VehicleSelector';
import LocationMapPicker from '@/components/LocationMapPicker';
import CityCombobox from '@/components/CityCombobox';
import { getPartCatalogSuggestions } from '@/lib/partCatalogService';

const normalizeSavedVehicle = (vehicle) => vehicle?.modelName ? {
  ...EMPTY_VEHICLE,
  ...vehicle,
  year: vehicle.year ? String(vehicle.year) : '',
} : EMPTY_VEHICLE;

const vehicleFormFields = (vehicle) => ({
  vehicleType: vehicle.type || '',
  vehicleBrand: vehicle.brandName || '',
  vehicleModel: vehicle.modelName || '',
  vehicleYear: vehicle.year || '',
  vehicleBrandId: vehicle.brandId || null,
  vehicleModelId: vehicle.modelId || null,
  vehicleYearId: vehicle.yearId || null,
  vehicleFuel: vehicle.fuel || '',
});

const createInitialFormData = (vehicle, savedLocation = null) => ({
  ...vehicleFormFields(vehicle),
  partName: '',
  partDescription: '',
  wantsPhotos: false,
  referencePhotoUrl: '',
  preferredCondition: 'any',
  locations: savedLocation ? [savedLocation] : [],
  duration: 15,
  searchLatitude: null,
  searchLongitude: null,
  searchLocationSource: 'city_center',
  searchRadiusKm: 10,
});

const SearchForm = ({ onProcuraCreate, onPhotoUpload, currentUser, allStatesAndCities = [], vehicleData = {}, onGoBack, editingProcura = null, reopeningProcura = false }) => {
  const savedVehicle = normalizeSavedVehicle(currentUser?.vehicles?.[0]);
  const hasSavedVehicle = Boolean(savedVehicle.modelName);
  const locationOptions = useMemo(() => (Array.isArray(allStatesAndCities) ? allStatesAndCities : []).flatMap(state =>
    (Array.isArray(state?.cities) ? state.cities : []).map(city => ({ value: `${city.value}, ${state.value}`, label: `${city.label} - ${state.label}`, municipalityId: city.id, city: city.value, state: state.value }))
  ).sort((a,b) => a.label.localeCompare(b.label)), [allStatesAndCities]);
  const savedLocation = useMemo(() => {
    const profileLocation = String(currentUser?.location || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (!profileLocation) return null;
    return locationOptions.find(option => profileLocation.endsWith(option.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())) || null;
  }, [currentUser?.location, locationOptions]);
  const [formData, setFormData] = useState(() => createInitialFormData(savedVehicle, savedLocation));

  const [availableParts, setAvailableParts] = useState([]);
  const [vehicle, setVehicle] = useState(savedVehicle);
  const [usingSavedVehicle, setUsingSavedVehicle] = useState(hasSavedVehicle);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCreatingProcura, setIsCreatingProcura] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    if (!editingProcura) return;
    const selectedVehicle = normalizeSavedVehicle({
      type: editingProcura.vehicleType,
      brandName: editingProcura.vehicleBrand,
      modelName: editingProcura.vehicleModel,
      year: editingProcura.vehicleYear,
      brandId: editingProcura.vehicleBrandId,
      modelId: editingProcura.vehicleModelId,
      yearId: editingProcura.vehicleYearId,
      fuel: editingProcura.vehicleFuel,
    });
    setVehicle(selectedVehicle);
    setUsingSavedVehicle(false);
    setFormData(previous => ({ ...previous, ...editingProcura, ...vehicleFormFields(selectedVehicle), locations: editingProcura.locations || [], searchRadiusKm: editingProcura.searchRadiusKm || 10 }));
  }, [editingProcura]);
  const photoInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const partNames = Array.isArray(vehicleData?.partNames) ? vehicleData.partNames : [];
    const fallbackParts = partNames.filter(part => {
      if (!formData.vehicleType) return true;
      if (formData.vehicleType === 'car' && !part.includes('(Moto)') && !part.includes('(Caminhão)')) return true;
      if (formData.vehicleType === 'motorcycle' && (part.includes('(Moto)') || !part.includes('(Caminhão)'))) return true;
      if (formData.vehicleType === 'truck' && (part.includes('(Caminhão)') || !part.includes('(Moto)'))) return true;
      if (formData.vehicleType === 'bus' && !part.includes('(Moto)')) return true;
      return part === 'Outra Peça';
    });

    getPartCatalogSuggestions(formData.vehicleType || null, fallbackParts)
      .then(parts => {
        if (active) setAvailableParts(parts);
      });
    setFormData(prev => ({ ...prev, partName: '' }));
    return () => { active = false; };
  }, [formData.vehicleType, vehicleData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCreatingProcura) return;
    
    const errors = {
      ...(!formData.vehicleType || !formData.vehicleBrand || !formData.vehicleModel ? { vehicle: 'Selecione o tipo, a marca e o modelo do veículo.' } : {}),
      ...(!formData.partName?.trim() ? { partName: 'Informe o nome da peça que você procura.' } : {}),
      ...(formData.locations.length === 0 ? { searchCity: 'Selecione a cidade onde deseja procurar.' } : {}),
    };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      window.requestAnimationFrame(() => {
        const target = document.getElementById(firstField === 'vehicle' ? 'searchVehicleSection' : firstField);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          const focusTarget = target?.matches?.('input,button,[tabindex]') ? target : target?.querySelector?.('input,button,[tabindex]:not([tabindex="-1"])');
          focusTarget?.focus({ preventScroll: true });
        }, 350);
      });
      toast({
        title: 'Falta preencher uma informação',
        description: errors[Object.keys(errors)[0]],
        variant: "destructive"
      });
      return;
    }

    const newProcura = {
      userId: currentUser?.id,
      category: 'pecas',
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'active',
      responses: []
    };

    setIsCreatingProcura(true);
    try {
      const created = await onProcuraCreate(newProcura);
      if (!created) return;

      setFormData(createInitialFormData(savedVehicle, savedLocation));
      setVehicle(savedVehicle);
      setUsingSavedVehicle(hasSavedVehicle);
    } finally {
      setIsCreatingProcura(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVehicleChange = (selected) => {
    setFieldErrors(previous => ({ ...previous, vehicle: '' }));
    setVehicle(selected);
    setFormData(prev => ({
      ...prev,
      vehicleType: selected.type,
      vehicleBrand: selected.brandName,
      vehicleModel: selected.modelName,
      vehicleYear: selected.year,
      vehicleBrandId: selected.brandId || null,
      vehicleModelId: selected.modelId || null,
      vehicleYearId: selected.yearId || null,
      vehicleFuel: selected.fuel,
    }));
  };

  const handleOtherVehicle = () => {
    setUsingSavedVehicle(false);
    setVehicle(EMPTY_VEHICLE);
    setFormData(prev => ({ ...prev, ...vehicleFormFields(EMPTY_VEHICLE) }));
  };

  const handleReferencePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !onPhotoUpload) return;
    setIsUploadingPhoto(true);
    try {
      const referencePhotoUrl = await onPhotoUpload(file);
      handleFieldChange('referencePhotoUrl', referencePhotoUrl);
      toast({ title: 'Foto adicionada', description: 'A imagem de referência foi salva.' });
    } catch (error) {
      toast({ title: 'Não foi possível enviar a foto', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 sm:mb-8"
    >
      <Card className="glass-effect border-primary/30">
        <CardHeader className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
            <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6" />
            {reopeningProcura ? 'Reabrir procura' : editingProcura ? 'Editar procura de peça' : 'Criar nova procura de peça'}
          </CardTitle>
          {onGoBack && (
            <Button variant="outline" size="sm" onClick={onGoBack} className="w-full sm:w-auto border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
            <div id="searchVehicleSection" tabIndex="-1" className={`rounded-xl ${fieldErrors.vehicle ? 'ring-2 ring-danger ring-offset-2 ring-offset-background' : ''}`}>
            {usingSavedVehicle ? (
              <Card className="border-primary/30 bg-primary/10 shadow-none">
                <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Car className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Meu automóvel</p>
                      <p className="truncate text-sm font-semibold text-foreground">{[savedVehicle.brandName, savedVehicle.modelName, savedVehicle.year].filter(Boolean).join(' • ')}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleOtherVehicle} className="w-full border-primary/50 text-foreground hover:bg-primary/15 sm:w-auto">
                    Outro automóvel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <VehicleSelector value={vehicle} onChange={handleVehicleChange} idPrefix="search-vehicle" />
            )}
            </div>
            {fieldErrors.vehicle && <p className="-mt-1 text-xs font-medium text-danger" role="alert">{fieldErrors.vehicle}</p>}

            <div className="relative">
              <Label htmlFor="partName" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Nome da Peça *</Label>
              <AutocompleteInput id="partName" placeholder="Digite ou selecione o nome da peça" value={formData.partName} onChange={(value) => { setFieldErrors(previous => ({ ...previous, partName: '' })); handleFieldChange('partName', value); }} onSelect={(value) => { setFieldErrors(previous => ({ ...previous, partName: '' })); handleFieldChange('partName', value); }} suggestions={availableParts} className={`bg-input text-sm ${fieldErrors.partName ? 'border-danger ring-1 ring-danger' : 'border-border'}`} disabled={!formData.vehicleType}/>
              {fieldErrors.partName && <p className="mt-1 text-xs font-medium text-danger" role="alert">{fieldErrors.partName}</p>}
            </div>

            <div>
              <Label htmlFor="partDescription" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Descrição Detalhada</Label>
              <Textarea id="partDescription" placeholder="Detalhes da peça, cor, condições, código (se souber), etc." value={formData.partDescription} onChange={(e) => handleFieldChange('partDescription', e.target.value)} className="bg-input border-border text-sm" rows={2}/>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs sm:text-sm font-medium text-muted-foreground">Condição desejada</Label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Condição desejada da peça">
                {[['any', 'Qualquer'], ['new', 'Nova'], ['used', 'Usada']].map(([value, label]) => (
                  <Button key={value} type="button" variant="outline" size="sm" aria-pressed={formData.preferredCondition === value} onClick={() => handleFieldChange('preferredCondition', value)} className={formData.preferredCondition === value ? 'border-primary bg-primary/15 text-primary' : ''}>{label}</Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs sm:text-sm font-medium text-muted-foreground">Foto de referência (opcional)</Label>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReferencePhoto} className="sr-only" />
              {formData.referencePhotoUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-popover">
                  <img src={formData.referencePhotoUrl} alt="Foto de referência da peça" className="h-40 w-full object-cover" />
                  <Button type="button" size="icon" variant="outline" onClick={() => handleFieldChange('referencePhotoUrl', '')} className="absolute right-2 top-2 h-11 w-11 bg-card/95" aria-label="Remover foto"><X className="h-5 w-5" /></Button>
                </div>
              ) : (
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-popover px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60">
                  {isUploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {isUploadingPhoto ? 'Enviando foto...' : 'Selecionar foto da peça'}
                </button>
              )}
            </div>
            
            <div>
              <Label htmlFor="searchCity" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" />Cidade onde deseja procurar *</Label>
              <CityCombobox
                id="searchCity"
                value={formData.locations[0]?.value || ''}
                onChange={(value) => {
                  const city = locationOptions.find(option => option.value === value);
                  setFieldErrors(previous => ({ ...previous, searchCity: '' }));
                  setFormData(prev => ({ ...prev, locations: city ? [city] : [], searchLatitude: null, searchLongitude: null, searchLocationSource: 'city_center' }));
                }}
                options={locationOptions}
                placeholder="Selecione uma cidade"
                searchPlaceholder="Digite a cidade ou o estado"
                className={fieldErrors.searchCity ? 'border-danger ring-1 ring-danger' : ''}
              />
              {fieldErrors.searchCity && <p className="mt-1 text-xs font-medium text-danger" role="alert">{fieldErrors.searchCity}</p>}
              <p className="text-xs text-muted-foreground mt-1">Esta localização será usada para encontrar empresas cujo plano alcança a sua região.</p>
            </div>

            {formData.locations[0] && (
              <LocationMapPicker
                value={{ latitude: formData.searchLatitude, longitude: formData.searchLongitude, source: formData.searchLocationSource }}
                lookupQuery={formData.locations[0].value}
                municipalityId={formData.locations[0].municipalityId}
                city={formData.locations[0].city}
                state={formData.locations[0].state}
                onChange={({ latitude, longitude, source = 'manual', municipality: locatedMunicipality }) => setFormData(prev => {
                  const gpsCity = locatedMunicipality ? locationOptions.find(option => String(option.municipalityId) === String(locatedMunicipality.id)) : null;
                  return { ...prev, locations: gpsCity ? [gpsCity] : prev.locations, searchLatitude: latitude, searchLongitude: longitude, searchLocationSource: source };
                })}
                allowGps
              />
            )}
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="duration" className="block text-xs sm:text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Duração da Procura: {formData.duration} dia(s)
              </Label>
              <Slider
                id="duration"
                min={1} max={15} step={1}
                defaultValue={[15]}
                value={[formData.duration]}
                onValueChange={(value) => handleFieldChange('duration', value[0])}
                className="[&>span:first-child]:h-1 [&>span:first-child]:bg-primary"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="wantsPhotos" checked={formData.wantsPhotos} onCheckedChange={(checked) => handleFieldChange('wantsPhotos', Boolean(checked))} className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"/>
              <Label htmlFor="wantsPhotos" className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 text-muted-foreground">
                <Camera className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />Desejo receber fotos da peça
              </Label>
            </div>

            <Button type="submit" disabled={isCreatingProcura || isUploadingPhoto} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3 text-sm sm:text-base" aria-live="polite">
              {isCreatingProcura ? <><span className="mr-2 inline-flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" /></span>{reopeningProcura ? 'Reabrindo procura' : editingProcura ? 'Salvando procura' : 'Criando procura'}</> : <><PackagePlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />{reopeningProcura ? 'Criar nova procura com estes dados' : editingProcura ? 'Salvar alterações' : 'Criar procura'}</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SearchForm;
