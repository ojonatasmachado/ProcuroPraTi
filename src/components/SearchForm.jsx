
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Car, MapPin, Camera, PackagePlus, CalendarDays, ArrowLeft, Bike, Truck, Bus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import AutocompleteInput from '@/components/AutocompleteInput'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import MultiSelectLocations from '@/components/MultiSelectLocations';

const SearchForm = ({ onProcuraCreate, currentUser, allStatesAndCities, vehicleData, onGoBack }) => {
  const [formData, setFormData] = useState({
    vehicleType: '', // 'car', 'motorcycle', 'truck'
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    partName: '',
    partDescription: '',
    wantsPhotos: false,
    locations: [], 
    duration: 15,
  });

  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);

  useEffect(() => {
    if (formData.vehicleType) {
      const brands = vehicleData.vehicleBrands.filter(brand => {
        if (formData.vehicleType === 'car' && !brand.includes('(Moto)') && !brand.includes('(Caminhão)') && !brand.includes('(Ônibus)')) return true;
        if (formData.vehicleType === 'motorcycle' && brand.includes('(Moto)')) return true;
        if (formData.vehicleType === 'truck' && brand.includes('(Caminhão)')) return true;
        if (formData.vehicleType === 'bus' && brand.includes('(Ônibus)')) return true;
        if (brand === 'Outra') return true;
        return false;
      });
      setAvailableBrands(brands.sort((a, b) => a.localeCompare(b)));

      const parts = vehicleData.partNames.filter(part => {
        if (formData.vehicleType === 'car' && !part.includes('(Moto)') && !part.includes('(Caminhão)')) return true;
        if (formData.vehicleType === 'motorcycle' && (part.includes('(Moto)') || !part.includes('(Caminhão)'))) return true; // Moto parts can also be generic
        if (formData.vehicleType === 'truck' && (part.includes('(Caminhão)') || !part.includes('(Moto)'))) return true; // Truck parts can also be generic
        if (formData.vehicleType === 'bus' && !part.includes('(Moto)')) return true; // Bus shares generic + truck-style parts
        if (part === 'Outra Peça') return true;
        return false;
      });
      setAvailableParts(parts.sort((a,b) => a.localeCompare(b)));
    } else {
      setAvailableBrands([]);
      setAvailableParts(vehicleData.partNames.sort((a,b) => a.localeCompare(b)));
    }
    setFormData(prev => ({ ...prev, vehicleBrand: '', vehicleModel: '', partName: '' }));
  }, [formData.vehicleType, vehicleData]);

  useEffect(() => {
    if (formData.vehicleBrand && vehicleData.vehicleModels[formData.vehicleBrand]) {
      setAvailableModels(vehicleData.vehicleModels[formData.vehicleBrand].sort((a,b) => a.localeCompare(b)));
    } else {
      setAvailableModels([]);
    }
    setFormData(prev => ({ ...prev, vehicleModel: '' }));
  }, [formData.vehicleBrand, vehicleData.vehicleModels]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.vehicleType || !formData.vehicleBrand || !formData.vehicleModel || !formData.partName || formData.locations.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Tipo de veículo, marca, modelo, nome da peça e pelo menos uma localidade são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const newProcura = {
      id: Date.now().toString(),
      userId: currentUser?.id,
      category: 'pecas',
      ...formData,
      createdAt: new Date().toISOString(),
      status: 'active',
      responses: []
    };

    onProcuraCreate(newProcura);
    
    setFormData({
      vehicleType: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '',
      partName: '', partDescription: '', wantsPhotos: false,
      locations: [], duration: 15,
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const locationOptions = useMemo(() => {
    return allStatesAndCities.flatMap(state => 
      state.cities.map(city => ({ value: `${city.value}, ${state.value}`, label: `${city.label} - ${state.label}` }))
    ).sort((a,b) => a.label.localeCompare(b.label));
  }, [allStatesAndCities]);

  const sortedVehicleYears = useMemo(() => [...vehicleData.vehicleYears].sort((a,b) => b.localeCompare(a)), [vehicleData.vehicleYears]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 sm:mb-8"
    >
      <Card className="glass-effect border-primary/30">
        <CardHeader className="pb-4 sm:pb-6 flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
            <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6" />
            Criar Nova Procura de Peça
          </CardTitle>
          {onGoBack && (
            <Button variant="outline" size="sm" onClick={onGoBack} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="vehicleType" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Tipo de Veículo *</Label>
              <Select value={formData.vehicleType} onValueChange={(value) => handleFieldChange('vehicleType', value)}>
                <SelectTrigger id="vehicleType" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                  <SelectItem value="car"><Car className="inline-block mr-2 h-4 w-4"/>Carro</SelectItem>
                  <SelectItem value="motorcycle"><Bike className="inline-block mr-2 h-4 w-4"/>Moto</SelectItem>
                  <SelectItem value="truck"><Truck className="inline-block mr-2 h-4 w-4"/>Caminhão</SelectItem>
                  <SelectItem value="bus"><Bus className="inline-block mr-2 h-4 w-4"/>Ônibus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Label htmlFor="vehicleBrand" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Marca *</Label>
                <Select value={formData.vehicleBrand} onValueChange={(value) => handleFieldChange('vehicleBrand', value)} disabled={!formData.vehicleType || availableBrands.length === 0}>
                  <SelectTrigger id="vehicleBrand" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{availableBrands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label htmlFor="vehicleModel" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Modelo *</Label>
                 <Select value={formData.vehicleModel} onValueChange={(value) => handleFieldChange('vehicleModel', value)} disabled={!formData.vehicleBrand || availableModels.length === 0}>
                  <SelectTrigger id="vehicleModel" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{availableModels.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label htmlFor="vehicleYear" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Ano</Label>
                 <Select value={formData.vehicleYear} onValueChange={(value) => handleFieldChange('vehicleYear', value)} disabled={!formData.vehicleType}>
                  <SelectTrigger id="vehicleYear" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{sortedVehicleYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="partName" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Nome da Peça *</Label>
              <AutocompleteInput id="partName" placeholder="Digite ou selecione o nome da peça" value={formData.partName} onChange={(value) => handleFieldChange('partName', value)} onSelect={(value) => handleFieldChange('partName', value)} suggestions={availableParts} className="bg-input border-border text-sm" disabled={!formData.vehicleType}/>
            </div>

            <div>
              <Label htmlFor="partDescription" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Descrição Detalhada</Label>
              <Textarea id="partDescription" placeholder="Detalhes da peça, cor, condições, código (se souber), etc." value={formData.partDescription} onChange={(e) => handleFieldChange('partDescription', e.target.value)} className="bg-input border-border text-sm" rows={2}/>
            </div>
            
            <div>
              <Label htmlFor="locations" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" />Localidade(s) da Procura *</Label>
              <MultiSelectLocations
                id="locations"
                placeholder="Selecione uma ou mais cidades/estados"
                value={formData.locations}
                onChange={(selectedOptions) => handleFieldChange('locations', selectedOptions || [])}
                options={locationOptions}
                className="text-sm"
              />
            </div>
            
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

            <Button type="submit" className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3 text-sm sm:text-base">
              <PackagePlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Criar Procura
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SearchForm;
