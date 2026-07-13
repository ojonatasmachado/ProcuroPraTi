
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserCircle, Save, X, Building2, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import MultiSelectLocations from '@/components/MultiSelectLocations'; // Keep for potential future use if CDV serves multiple distinct locations
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const UserProfileForm = ({ user, userType, onSave, onCancel, allStatesAndCities }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    addressState: '',
    addressCity: '',
    addressStreet: '', // For street, number, neighborhood
    cnpj: user.cnpj || '',
  });
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      cnpj: user.cnpj || '',
      addressState: user.address ? user.address.split(',').pop()?.trim() : '',
      addressCity: user.address ? user.address.split(',').slice(-2, -1)[0]?.trim() : '',
      addressStreet: user.address ? user.address.split(',').slice(0, -2).join(',').trim() : '',
    });
  }, [user]);

  useEffect(() => {
    if (formData.addressState) {
      const stateData = allStatesAndCities.find(s => s.value === formData.addressState);
      setAvailableCities(stateData ? stateData.cities.sort((a,b) => a.label.localeCompare(b.label)) : []);
    } else {
      setAvailableCities([]);
    }
  }, [formData.addressState, allStatesAndCities]);


  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value, ...(field === 'addressState' && { addressCity: '' }) }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios.", variant: "destructive" });
      return;
    }
    
    let fullAddress = '';
    if (userType === 'cdv') {
      if (!formData.cnpj || !formData.addressStreet || !formData.addressCity || !formData.addressState) {
        toast({ title: "Erro", description: "CNPJ e Endereço completo (Rua, Cidade, Estado) são obrigatórios para CDV.", variant: "destructive" });
        return;
      }
      fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
    } else if (userType === 'user' && (formData.addressStreet || formData.addressCity || formData.addressState)) {
       if (!formData.addressStreet || !formData.addressCity || !formData.addressState) {
        toast({ title: "Endereço Incompleto", description: "Para salvar o endereço, por favor preencha Rua, Cidade e Estado.", variant: "destructive" });
        return;
      }
      fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
    }


    const dataToSave = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cnpj: userType === 'cdv' ? formData.cnpj : undefined,
      address: fullAddress || user.address, // Keep old address if new one is not fully provided for user
      // servesLocations is now automatically derived from address for CDV in App.jsx
    };
    onSave(dataToSave);
    toast({ title: "Sucesso!", description: "Perfil atualizado." });
  };
  
  const sortedStates = useMemo(() => [...allStatesAndCities].sort((a,b) => a.label.localeCompare(b.label)), [allStatesAndCities]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="glass-effect border-border/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-2">
              {userType === 'user' ? <Users className="h-7 w-7 sm:h-8 sm:h-8" /> : <Building2 className="h-7 w-7 sm:h-8 sm:h-8" />}
              Editar Perfil de {userType === 'user' ? 'Usuário' : 'CDV'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Atualize suas informações pessoais ou do seu CDV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Nome Completo / Razão Social *</Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} required className="bg-input border-border text-sm"/>
              </div>
              <div>
                <Label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Email *</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="bg-input border-border text-sm"/>
              </div>
              <div>
                <Label htmlFor="phone" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Telefone</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="bg-input border-border text-sm"/>
              </div>
              
              {userType === 'cdv' && (
                <div>
                  <Label htmlFor="cnpj" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">CNPJ *</Label>
                  <Input id="cnpj" name="cnpj" type="text" value={formData.cnpj} onChange={handleInputChange} required className="bg-input border-border text-sm"/>
                </div>
              )}

              <div>
                <Label htmlFor="addressStreet" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Endereço (Rua, Nº, Bairro){userType === 'cdv' ? ' *' : ''}</Label>
                <Input id="addressStreet" name="addressStreet" type="text" placeholder="Ex: Rua Principal, 123, Centro" value={formData.addressStreet} onChange={handleInputChange} className="bg-input border-border text-sm"/>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="addressState" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Estado{userType === 'cdv' ? ' *' : ''}</Label>
                  <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                    <SelectTrigger id="addressState" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione Estado" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="addressCity" className="block text-xs sm:text-sm font-medium mb-1 text-muted-foreground">Cidade{userType === 'cdv' ? ' *' : ''}</Label>
                  <Select value={formData.addressCity} onValueChange={(value) => handleSelectChange('addressCity', value)} disabled={!formData.addressState || availableCities.length === 0}>
                    <SelectTrigger id="addressCity" className="bg-input border-border w-full text-sm"><SelectValue placeholder="Selecione Cidade" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">{availableCities.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {userType === 'cdv' && <p className="text-xs text-muted-foreground -mt-2">A localidade de atendimento do seu CDV será automaticamente definida com base neste endereço.</p>}


              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button type="submit" className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 text-sm sm:text-base">
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Salvar Alterações
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold py-2.5 text-sm sm:text-base">
                  <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UserProfileForm;
