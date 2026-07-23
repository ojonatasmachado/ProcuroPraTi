
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, X, Building2, Users, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CepAddressLookup, { formatCep } from '@/components/CepAddressLookup.jsx';
import CnpjLookup from '@/components/CnpjLookup.jsx';
import { formatCnpj, isValidCnpj } from '@/lib/cnpj';
import VehicleSelector, { EMPTY_VEHICLE } from '@/components/VehicleSelector';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import { geocodeAddress } from '@/lib/geocoding';
import CityCombobox from '@/components/CityCombobox';
import VehicleTypeSelector from '@/components/VehicleTypeSelector';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const splitSavedAddress = (address = '', savedNumber = '') => {
  const parts = String(address).split(',').map(part => part.trim()).filter(Boolean);
  const addressState = parts.at(-1) || '';
  const addressCity = parts.at(-2) || '';
  const content = parts.slice(0, -2);
  const detectedIndex = savedNumber
    ? content.findIndex(part => part === String(savedNumber).trim())
    : content.findIndex((part, index) => index > 0 && /^(?:\d+[A-Za-z0-9./-]*|S\/?N)$/i.test(part));
  const addressNumber = savedNumber || (detectedIndex >= 0 ? content[detectedIndex] : '');
  const addressStreet = content.filter((_, index) => index !== detectedIndex).join(', ');
  return { addressState, addressCity, addressStreet, addressNumber };
};

const UserProfileForm = ({ user, userType, onSave, onDeleteAccount, onCancel, allStatesAndCities }) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const savedAddress = splitSavedAddress(userType === 'company' ? user.address : user.location, userType === 'company' ? user.addressNumber : '');
  const [vehicle, setVehicle] = useState(user.vehicles?.[0] || EMPTY_VEHICLE);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    whatsapp: user.whatsapp || '',
    addressCep: formatCep(user.postalCode || ''),
    ...savedAddress,
    cnpj: formatCnpj(user.cnpj || ''),
    vehicleTypes: user.vehicleTypes || [],
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    locationSource: user.locationSource || 'city_center',
  });
  const availableCities = useMemo(() => {
    if (!formData.addressState) return [];
    const stateData = allStatesAndCities.find(s => s.value === formData.addressState);
    const cities = stateData ? [...stateData.cities] : [];
    if (formData.addressCity && !cities.some(city => city.value === formData.addressCity)) {
      cities.push({ value: formData.addressCity, label: formData.addressCity });
    }
    return cities.sort((a, b) => a.label.localeCompare(b.label));
  }, [formData.addressState, formData.addressCity, allStatesAndCities]);

  useEffect(() => {
    const nextSavedAddress = splitSavedAddress(userType === 'company' ? user.address : user.location, userType === 'company' ? user.addressNumber : '');
    setVehicle(user.vehicles?.[0] || EMPTY_VEHICLE);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      addressCep: formatCep(user.postalCode || ''),
      cnpj: formatCnpj(user.cnpj || ''),
      vehicleTypes: user.vehicleTypes || [],
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      locationSource: user.locationSource || 'city_center',
      ...nextSavedAddress,
    });
  }, [user, userType]);

  const handleInputChange = (e) => {
    const resetsLocation = e.target.name === 'addressStreet' || e.target.name === 'addressNumber';
    setFormData({ ...formData, [e.target.name]: e.target.value, ...(resetsLocation ? { latitude: null, longitude: null, locationSource: 'city_center' } : {}) });
  };
  
  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value, latitude: null, longitude: null, locationSource: 'city_center', ...(field === 'addressState' && { addressCity: '' }) }));
  };

  const handleAddressFound = (address) => {
    const stateData = allStatesAndCities.find(item => item.value === address.addressState);
    const normalizedCity = (address.addressCity || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const city = stateData?.cities.find(item => item.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedCity)?.value || address.addressCity;
    setFormData(prev => ({
      ...prev,
      ...address,
      addressStreet: address.addressStreet || prev.addressStreet,
      addressCity: city,
      locationSource: address.source || prev.locationSource,
    }));
  };

  const handleCompanyFound = async (company) => {
    const state = company.uf || '';
    const stateData = allStatesAndCities.find(item => item.value === state);
    const normalizedCity = (company.municipio || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const city = stateData?.cities.find(item => item.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalizedCity)?.value || company.municipio || '';

    const addressStreet = [company.logradouro, company.complemento, company.bairro].filter(Boolean).join(', ');
    const addressCep = formatCep(company.cep || '');
    setFormData(prev => ({
      ...prev,
      name: company.razao_social || company.nome_fantasia || prev.name,
      phone: company.ddd_telefone_1 || prev.phone,
      addressCep,
      addressStreet,
      addressNumber: company.numero || prev.addressNumber,
      addressCity: city,
      addressState: state,
      latitude: null,
      longitude: null,
      locationSource: 'city_center',
    }));
    const coordinates = await geocodeAddress({ cep: addressCep, street: [addressStreet, company.numero].filter(Boolean).join(', '), city, state });
    if (coordinates) setFormData(prev => ({ ...prev, ...coordinates, locationSource: coordinates.source || 'cep' }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios.", variant: "destructive" });
      return;
    }
    if (userType === 'company' && !isValidCnpj(formData.cnpj)) {
      toast({ title: "CNPJ inválido", description: "Confira o identificador informado.", variant: "destructive" });
      return;
    }
    if (userType === 'company' && formData.vehicleTypes.length === 0) {
      toast({ title: "Tipos de veículos obrigatórios", description: "Selecione pelo menos um tipo de veículo atendido.", variant: "destructive" });
      return;
    }
    
    let fullAddress = '';
    if (userType === 'company') {
      if (!formData.cnpj || !formData.addressCep || !formData.addressStreet || !formData.addressNumber || !formData.addressCity || !formData.addressState) {
        toast({ title: "Endereço incompleto", description: "CEP, rua, número, cidade e estado são obrigatórios para empresas vendedoras.", variant: "destructive" });
        return;
      }
      fullAddress = `${formData.addressStreet}, ${formData.addressNumber}, ${formData.addressCity}, ${formData.addressState}`;
    } else if (userType === 'user' && (formData.addressStreet || formData.addressCity || formData.addressState)) {
       if (!formData.addressStreet || !formData.addressCity || !formData.addressState) {
        toast({ title: "Endereço Incompleto", description: "Para salvar o endereço, por favor preencha Rua, Cidade e Estado.", variant: "destructive" });
        return;
      }
      fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
    }


    const coordinates = userType === 'company' && !(Number.isFinite(formData.latitude) && Number.isFinite(formData.longitude))
      ? await geocodeAddress({ cep: formData.addressCep, street: `${formData.addressStreet}, ${formData.addressNumber}`, city: formData.addressCity, state: formData.addressState })
      : { latitude: formData.latitude, longitude: formData.longitude };

    const dataToSave = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      whatsapp: userType === 'company' ? formData.whatsapp : undefined,
      cnpj: userType === 'company' ? formData.cnpj.toUpperCase().replace(/[^A-Z0-9]/g, '') : undefined,
      address: userType === 'company' ? (fullAddress || user.address) : undefined,
      addressNumber: userType === 'company' ? formData.addressNumber.trim() : undefined,
      postalCode: formData.addressCep ? formData.addressCep.replace(/\D/g, '') : undefined,
      latitude: userType === 'company' ? coordinates?.latitude : undefined,
      longitude: userType === 'company' ? coordinates?.longitude : undefined,
      locationSource: userType === 'company' ? (formData.locationSource || coordinates?.source || 'cep') : undefined,
      vehicleTypes: userType === 'company' ? formData.vehicleTypes : undefined,
      location: userType === 'user' ? (fullAddress || user.location) : undefined,
      vehicles: userType === 'user' && vehicle.modelName ? [vehicle] : [],
    };
    await onSave(dataToSave);
  };
  
  const sortedStates = useMemo(() => [...allStatesAndCities].sort((a,b) => a.label.localeCompare(b.label)), [allStatesAndCities]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <header className="safe-header sticky top-0 z-40 w-full border-b border-border bg-card/90 px-3 py-3 shadow-sm backdrop-blur-md sm:px-4">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <BrandLogo as="h1" compactOnMobile iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-lg sm:text-2xl" />
          <ThemeToggle />
        </div>
      </header>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="my-auto w-full max-w-lg p-4"
      >
        <Card className="glass-effect border-border/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              {userType === 'user' ? <Users className="h-7 w-7 sm:h-8" /> : <Building2 className="h-7 w-7 sm:h-8" />}
              Editar Perfil de {userType === 'user' ? 'Usuário' : 'Empresa'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Atualize suas informações pessoais ou da sua empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {userType === 'company' && (
                <CnpjLookup
                  value={formData.cnpj}
                  onChange={(cnpj) => setFormData(prev => ({ ...prev, cnpj }))}
                  onCompanyFound={handleCompanyFound}
                  required
                  inputClassName="bg-input border-border text-sm"
                />
              )}

              <div>
                <Label htmlFor="name" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Nome Completo / Razão Social *</Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} required className="bg-input border-border text-sm"/>
              </div>
              <div>
                <Label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Email *</Label>
                <Input id="email" name="email" type="email" value={formData.email} readOnly className="bg-input border-border text-sm opacity-70"/>
                <p className="text-xs text-muted-foreground mt-1">O email de acesso não pode ser alterado por esta tela.</p>
              </div>
              <div>
                <Label htmlFor="phone" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">{userType === 'company' ? 'Telefone da empresa' : 'Telefone'}</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="bg-input border-border text-sm"/>
              </div>
              {userType === 'company' && <div>
                <Label htmlFor="whatsapp" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" value={formData.whatsapp} onChange={handleInputChange} placeholder="(XX) XXXXX-XXXX" className="bg-input border-border text-sm"/>
              </div>}

              {userType === 'user' && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Meu veículo (opcional)</p>
                    <p className="text-xs text-muted-foreground">Este veículo ficará salvo no seu perfil.</p>
                  </div>
                  <VehicleSelector value={vehicle} onChange={setVehicle} idPrefix="profile-vehicle" />
                </div>
              )}

              <CepAddressLookup
                value={formData.addressCep}
                onChange={(addressCep) => setFormData(prev => ({ ...prev, addressCep }))}
                onAddressFound={handleAddressFound}
                inputClassName="bg-input border-border text-sm"
              />

              <div>
                <Label htmlFor="addressStreet" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Rua e bairro{userType === 'company' ? ' *' : ''}</Label>
                <Input id="addressStreet" name="addressStreet" type="text" placeholder="Ex: Rua Principal, Centro" value={formData.addressStreet} onChange={handleInputChange} className="bg-input border-border text-sm"/>
              </div>
              {userType === 'company' && <div>
                <Label htmlFor="addressNumber" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Número da empresa *</Label>
                <Input id="addressNumber" name="addressNumber" type="text" value={formData.addressNumber} onChange={handleInputChange} placeholder="Ex: 123 ou S/N" className="bg-input border-border text-sm"/>
              </div>}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="addressState" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Estado{userType === 'company' ? ' *' : ''}</Label>
                  <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                    <SelectTrigger id="addressState" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione Estado" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="addressCity" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Cidade{userType === 'company' ? ' *' : ''}</Label>
                  <CityCombobox id="addressCity" value={formData.addressCity} onChange={(value) => handleSelectChange('addressCity', value)} options={availableCities} placeholder="Selecione Cidade" disabled={!formData.addressState || availableCities.length === 0} />
                </div>
              </div>
              {userType === 'company' && <p className="text-xs text-muted-foreground -mt-2">A localidade de atendimento da empresa será definida com base neste endereço.</p>}

              {userType === 'company' && (
                <div className="space-y-2 rounded-xl border border-border bg-input/30 p-3">
                  <div><Label className="text-sm font-semibold text-foreground">Veículos atendidos *</Label><p className="mt-1 text-xs text-muted-foreground">As procuras serão filtradas por região e por estes tipos de veículos.</p></div>
                  <VehicleTypeSelector value={formData.vehicleTypes} onChange={(vehicleTypes) => setFormData(prev => ({ ...prev, vehicleTypes }))} idPrefix="profile-company-vehicle-types" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button type="submit" className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 text-sm sm:text-base">
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Salvar Alterações
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} className="w-full border-danger/60 text-danger hover:bg-destructive/20 font-semibold py-2.5 text-sm sm:text-base">
                  <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Cancelar
                </Button>
              </div>
              {userType === 'company' && <div className="mt-5 rounded-xl border border-danger/35 bg-danger/5 p-4">
                <p className="text-sm font-bold text-foreground">Excluir conta da empresa</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A empresa deixará de aparecer imediatamente. Email e CNPJ poderão ser usados em um novo cadastro.</p>
                <Button type="button" variant="outline" onClick={() => setShowDeleteConfirmation(true)} className="mt-3 w-full border-danger text-danger hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />Excluir conta
                </Button>
              </div>}
            </form>
          </CardContent>
        </Card>
      </motion.div>
      <Dialog open={showDeleteConfirmation} onOpenChange={(open) => { if (!isDeletingAccount) setShowDeleteConfirmation(open); }}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10"><AlertTriangle className="h-6 w-6 text-danger" /></div>
            <DialogTitle>Excluir definitivamente esta conta?</DialogTitle>
            <DialogDescription className="leading-relaxed">O acesso será encerrado, a empresa deixará de aparecer para compradores e esta ação não poderá ser desfeita. Caso volte futuramente, será criado um cadastro novo.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:grid sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirmation(false)} disabled={isDeletingAccount}>Manter conta</Button>
            <Button type="button" variant="destructive" disabled={isDeletingAccount} onClick={async () => {
              setIsDeletingAccount(true);
              const deleted = await onDeleteAccount?.();
              if (!deleted) setIsDeletingAccount(false);
            }}>
              {isDeletingAccount ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo</> : <><Trash2 className="mr-2 h-4 w-4" />Sim, excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfileForm;
