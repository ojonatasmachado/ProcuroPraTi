
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, ArrowLeft, ArrowRight, LogIn, UserPlus, FileText, Loader2, CheckCircle2, XCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import TermsModal from '@/components/TermsModal.jsx';
import CepAddressLookup, { formatCep } from '@/components/CepAddressLookup.jsx';
import CnpjLookup from '@/components/CnpjLookup.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isValidCnpj } from '@/lib/cnpj';
import VehicleSelector, { EMPTY_VEHICLE } from '@/components/VehicleSelector';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import { geocodeAddress } from '@/lib/geocoding';
import useScrollToTop from '@/hooks/useScrollToTop';
import CityCombobox from '@/components/CityCombobox';
import VehicleTypeSelector from '@/components/VehicleTypeSelector';

const FieldError = ({ children }) => children ? <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{children}</p> : null;

const UserRegistration = ({ onRegister, onSaveRegistrationProgress, onLogin, onCollaboratorLogin, onResendConfirmation, onRequestPasswordReset, onBackToLanding, accountExists, cnpjExists, allStatesAndCities, initialUserType, initialCollaboratorMode = false }) => {
  const [step, setStep] = useState('email');
  const [userType, setUserType] = useState(initialUserType === 'company' ? 'company' : 'user');
  const [showTerms, setShowTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCollaboratorPin, setShowCollaboratorPin] = useState(false);
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [registrationStage, setRegistrationStage] = useState('personal');
  const [passwordResetRequested, setPasswordResetRequested] = useState(false);
  const [collaboratorMode, setCollaboratorMode] = useState(initialCollaboratorMode);
  const [collaboratorForm, setCollaboratorForm] = useState({ cnpj: '', username: '', pin: '' });
  useScrollToTop(`${userType}-${step}-${registrationStage}`);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', whatsapp: '', cpf: '', addressCep: '',
    addressStreet: '', addressNumber: '', addressCity: '', addressState: '',
    cnpj: '', latitude: null, longitude: null, locationSource: 'city_center', vehicleTypes: [],
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
  const passwordRules = useMemo(() => [
    { label: 'Pelo menos 8 caracteres', valid: formData.password.length >= 8 },
    { label: 'Uma letra maiúscula e uma minúscula', valid: /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) },
    { label: 'Pelo menos um número', valid: /\d/.test(formData.password) },
    { label: 'Pelo menos um caractere especial', valid: /[^A-Za-z0-9]/.test(formData.password) },
  ], [formData.password]);
  const isPasswordValid = passwordRules.every(rule => rule.valid);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleInputChange = (e) => {
    const resetsLocation = e.target.name === 'addressStreet' || e.target.name === 'addressNumber';
    setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setFormError('');
    setFormData({ ...formData, [e.target.name]: e.target.value, ...(resetsLocation ? { latitude: null, longitude: null, locationSource: 'city_center' } : {}) });
  };

  const handleSelectChange = (field, value) => {
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setFormError('');
    setFormData(prev => ({ ...prev, [field]: value, latitude: null, longitude: null, locationSource: 'city_center', ...(field === 'addressState' && { addressCity: '' }) }));
  };

  const showValidationErrors = (errors, message = 'Revise os campos indicados para continuar.') => {
    setFieldErrors(errors);
    setFormError(message);
    const firstField = Object.keys(errors)[0];
    const fieldId = ({ vehicle: 'registrationVehicleSection', vehicleTypes: 'vehicleTypesSection' })[firstField] || firstField;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(fieldId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        const focusTarget = target?.matches?.('input,button,[tabindex]') ? target : target?.querySelector?.('input,button,[tabindex]:not([tabindex="-1"])');
        focusTarget?.focus({ preventScroll: true });
      }, 350);
    });
  };

  const handleAddressFound = (address) => {
    const stateData = allStatesAndCities.find(item => item.value === address.addressState);
    const normalizedCity = (address.addressCity || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const city = stateData?.cities.find(item => item.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedCity)?.value || address.addressCity;
    setFieldErrors(prev => ({ ...prev, addressCep: '', addressStreet: '', addressCity: '', addressState: '' }));
    setFormError('');
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
    const street = [company.logradouro, company.complemento, company.bairro].filter(Boolean).join(', ');

    const cep = formatCep(company.cep || '');
    setFieldErrors(prev => ({ ...prev, cnpj: '', name: '', addressCep: '', addressStreet: '', addressCity: '', addressState: '' }));
    setFormError('');
    setFormData(prev => ({
      ...prev,
      name: company.razao_social || company.nome_fantasia || prev.name,
      phone: company.ddd_telefone_1 || prev.phone,
      addressCep: cep,
      addressStreet: street || prev.addressStreet,
      addressNumber: company.numero || prev.addressNumber,
      addressCity: city,
      addressState: state,
      latitude: null,
      longitude: null,
      locationSource: 'city_center',
    }));
    const coordinates = await geocodeAddress({ cep, street: [street, company.numero].filter(Boolean).join(', '), city, state });
    if (coordinates) setFormData(prev => ({ ...prev, ...coordinates, locationSource: coordinates.source || 'cep' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    if (step === 'email') {
      const email = formData.email.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showValidationErrors({ email: !email ? 'Informe seu email para continuar.' : 'Informe um email válido, por exemplo nome@empresa.com.' });
        return;
      }
      setFormData(prev => ({ ...prev, email }));
      setIsSubmitting(true);
      try {
        const existingType = await accountExists(email);
        if (existingType) {
          setUserType(existingType);
          setStep('password');
        } else {
          setStep('register');
        }
      } catch (error) {
        setFormError(error.message || 'Não foi possível verificar o email agora. Tente novamente.');
        toast({ title: 'Não foi possível verificar o email', description: error.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === 'password') {
      const errors = {};
      if (!formData.email) errors.email = 'Informe seu email.';
      if (!formData.password) errors.password = 'Informe sua senha para entrar.';
      if (Object.keys(errors).length) {
        showValidationErrors(errors, 'Informe email e senha para entrar.');
        return;
      }
      setIsSubmitting(true);
      try {
        const loginResult = await onLogin(formData.email, formData.password, userType);
        if (!loginResult?.success) setFormError(loginResult?.needsConfirmation ? 'Confirme seu email pelo link enviado antes de entrar.' : 'Não foi possível entrar. Confira o email e a senha.');
        if (loginResult?.needsConfirmation) setStep('confirmation');
      } catch (error) {
        setFormError(error.message || 'Não foi possível entrar agora. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (userType === 'user') {
        if (registrationStage === 'personal') {
          const errors = {};
          if (!formData.name.trim()) errors.name = 'Informe seu nome completo.';
          if (!formData.email.trim()) errors.email = 'Informe seu email.';
          if (!formData.password) errors.password = 'Crie uma senha para continuar.';
          if (!formData.confirmPassword) errors.confirmPassword = 'Repita sua senha.';
          if (Object.keys(errors).length) return showValidationErrors(errors);
          if (formData.password !== formData.confirmPassword) return showValidationErrors({ confirmPassword: 'As senhas não coincidem.' });
          if (!isPasswordValid) return showValidationErrors({ password: 'Sua senha ainda não atende a todos os requisitos abaixo.' });

          setIsSubmitting(true);
          try {
            await onSaveRegistrationProgress({ email: formData.email, name: formData.name, phone: formData.phone, stage: 'personal', data: {} });
            setRegistrationStage('address');
          } catch (error) {
            setFormError(error.message || 'Não foi possível salvar seus dados agora. Tente novamente.');
          } finally {
            setIsSubmitting(false);
          }
          return;
        }

        if (registrationStage === 'address') {
          const errors = {};
          if (!formData.addressCep) errors.addressCep = 'Informe o CEP para localizar o endereço.';
          if (!formData.addressStreet) errors.addressStreet = 'Informe a rua e o bairro.';
          if (!formData.addressState) errors.addressState = 'Selecione o estado.';
          if (!formData.addressCity) errors.addressCity = 'Selecione a cidade.';
          if (Object.keys(errors).length) return showValidationErrors(errors, 'Preencha seu endereço para continuar.');

          setIsSubmitting(true);
          try {
            await onSaveRegistrationProgress({
              email: formData.email,
              name: formData.name,
              phone: formData.phone,
              stage: 'address',
              data: { addressCep: formData.addressCep, addressStreet: formData.addressStreet, addressCity: formData.addressCity, addressState: formData.addressState },
            });
            setRegistrationStage('vehicle');
          } catch (error) {
            setFormError(error.message || 'Não foi possível salvar seu endereço agora. Tente novamente.');
          } finally {
            setIsSubmitting(false);
          }
          return;
        }

        const errors = {};
        if (!vehicle.type) errors.vehicle = 'Selecione o tipo do veículo.';
        if (!vehicle.brandName) errors.vehicle = 'Selecione a marca do veículo.';
        if (!vehicle.modelName) errors.vehicle = 'Selecione o modelo do veículo.';
        if (Object.keys(errors).length) return showValidationErrors(errors, 'Informe seu veículo para criar a conta.');

        const fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
        setIsSubmitting(true);
        try {
          await onSaveRegistrationProgress({ email: formData.email, name: formData.name, phone: formData.phone, stage: 'vehicle', data: { vehicle, addressCep: formData.addressCep, addressStreet: formData.addressStreet, addressCity: formData.addressCity, addressState: formData.addressState } });
          const registration = await onRegister({
            name: formData.name, email: formData.email, password: formData.password,
            phone: formData.phone, location: fullAddress,
            postalCode: formData.addressCep.replace(/\D/g, ''), vehicles: [vehicle],
          }, userType);
          if (!registration?.success) {
            setFormError('Não foi possível criar a conta. Confira os dados e tente novamente.');
            return;
          }
          try {
            await onSaveRegistrationProgress({ email: formData.email, name: formData.name, phone: formData.phone, stage: 'completed', data: { completedAt: new Date().toISOString() } });
          } catch {
            // A conta já foi criada. O registro analítico não deve impedir o acesso do usuário.
          }
          if (registration?.needsConfirmation) setStep('confirmation');
        } catch (error) {
          setFormError(error.message || 'Não foi possível criar a conta agora. Tente novamente.');
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const requiredErrors = {};
      if (!formData.name.trim()) requiredErrors.name = userType === 'company' ? 'Informe a razão social da empresa.' : 'Informe seu nome completo.';
      if (!formData.email.trim()) requiredErrors.email = 'Informe seu email.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) requiredErrors.email = 'Informe um email válido, por exemplo nome@empresa.com.';
      if (!formData.password) requiredErrors.password = 'Crie uma senha para continuar.';
      if (!formData.confirmPassword) requiredErrors.confirmPassword = 'Repita sua senha.';
      if (Object.keys(requiredErrors).length) {
        showValidationErrors(requiredErrors);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showValidationErrors({ confirmPassword: 'As senhas não coincidem.' });
        return;
      }
      if (!isPasswordValid) {
        showValidationErrors({ password: 'Sua senha ainda não atende a todos os requisitos abaixo.' });
        return;
      }
      if (userType === 'company' && !isValidCnpj(formData.cnpj)) {
        showValidationErrors({ cnpj: 'Informe um CNPJ válido.' });
        return;
      }
      if (userType === 'company' && formData.vehicleTypes.length === 0) {
        showValidationErrors({ vehicleTypes: 'Selecione pelo menos um tipo de veículo atendido.' });
        return;
      }
      if (userType === 'company') {
        try {
          if (await cnpjExists(formData.cnpj)) {
            showValidationErrors({ cnpj: 'Já existe uma empresa vendedora vinculada a este CNPJ.' });
            return;
          }
        } catch (error) {
          showValidationErrors({ cnpj: error.message || 'Não foi possível validar o CNPJ agora.' });
          return;
        }
      }
      
      let fullAddress = '';
      if (userType === 'company') {
        if (!formData.cnpj || !formData.addressCep || !formData.addressStreet || !formData.addressNumber || !formData.addressCity || !formData.addressState) {
          showValidationErrors({
            ...(formData.cnpj ? {} : { cnpj: 'Informe o CNPJ da empresa.' }),
            ...(formData.addressCep ? {} : { addressCep: 'Informe o CEP para localizar o endereço.' }),
            ...(formData.addressStreet ? {} : { addressStreet: 'Informe a rua e o bairro.' }),
            ...(formData.addressNumber ? {} : { addressNumber: 'Informe o número da empresa.' }),
            ...(formData.addressState ? {} : { addressState: 'Selecione o estado.' }),
            ...(formData.addressCity ? {} : { addressCity: 'Selecione a cidade.' }),
          }, 'CNPJ e endereço completo são obrigatórios para empresas vendedoras.');
          return;
        }
        fullAddress = `${formData.addressStreet}, ${formData.addressNumber}, ${formData.addressCity}, ${formData.addressState}`;
      } else if (userType === 'user' && (formData.addressStreet || formData.addressCity || formData.addressState)) {
         if (!formData.addressStreet || !formData.addressCity || !formData.addressState) {
          showValidationErrors({
            ...(formData.addressStreet ? {} : { addressStreet: 'Informe a rua e o bairro.' }),
            ...(formData.addressState ? {} : { addressState: 'Selecione o estado.' }),
            ...(formData.addressCity ? {} : { addressCity: 'Selecione a cidade.' }),
          }, 'Para salvar o endereço, preencha rua, cidade e estado.');
          return;
        }
        fullAddress = `${formData.addressStreet}, ${formData.addressCity}, ${formData.addressState}`;
      }

      let coordinates = Number.isFinite(formData.latitude) && Number.isFinite(formData.longitude)
        ? { latitude: formData.latitude, longitude: formData.longitude }
        : null;
      if (userType === 'company' && !coordinates) {
        coordinates = await geocodeAddress({ cep: formData.addressCep, street: `${formData.addressStreet}, ${formData.addressNumber}`, city: formData.addressCity, state: formData.addressState });
      }

      setIsSubmitting(true);
      try {
      const registration = await onRegister({
        name: formData.name, email: formData.email, password: formData.password, 
        phone: formData.phone,
        whatsapp: userType === 'company' ? formData.whatsapp : undefined,
        cpf: userType === 'user' ? formData.cpf.replace(/\D/g, '') : undefined,
        location: fullAddress, // For user, this is their general location
        cnpj: userType === 'company' ? formData.cnpj.toUpperCase().replace(/[^A-Z0-9]/g, '') : undefined,
        address: userType === 'company' ? fullAddress : undefined, // Specific for CDV
        addressNumber: userType === 'company' ? formData.addressNumber.trim() : undefined,
        postalCode: formData.addressCep ? formData.addressCep.replace(/\D/g, '') : undefined,
        latitude: userType === 'company' ? coordinates?.latitude : undefined,
        longitude: userType === 'company' ? coordinates?.longitude : undefined,
        locationSource: userType === 'company' ? (formData.locationSource || coordinates?.source || 'cep') : undefined,
        vehicleTypes: userType === 'company' ? formData.vehicleTypes : undefined,
        vehicles: userType === 'user' && vehicle.modelName ? [vehicle] : [],
      }, userType);
      if (!registration?.success) {
        setFormError('Não foi possível efetuar o cadastro. Confira os dados e tente novamente.');
        return;
      }
      if (registration?.needsConfirmation) setStep('confirmation');
      } catch (error) {
        setFormError(error.message || 'Não foi possível efetuar o cadastro agora. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isLogin = step === 'password';
  const isForgotPassword = step === 'forgot-password';
  const isRegistration = step === 'register';
  const isConfirmation = step === 'confirmation';
  const userStageTitle = { personal: 'Seus dados', address: 'Seu endereço', vehicle: 'Seu veículo' }[registrationStage];
  const cardTitle = step === 'email' ? "Como você quer usar?" : (isLogin ? "Digite sua senha" : (isForgotPassword ? 'Recuperar senha' : (isConfirmation ? "Confirme seu email" : (userType === 'user' ? userStageTitle : 'Complete seu cadastro'))));
  const buttonText = step === 'email' ? "Avançar" : (isLogin ? "Entrar" : (userType === 'company' ? "Cadastrar empresa" : (registrationStage === 'vehicle' ? 'Criar conta' : 'Avançar')));

  const sortedStates = useMemo(() => [...allStatesAndCities].sort((a,b) => a.label.localeCompare(b.label)), [allStatesAndCities]);

  const isCompanyIntent = userType === 'company';

  const resetFlow = (type = userType) => {
    setCollaboratorMode(false);
    setUserType(type);
    setStep('email');
    setVehicle(EMPTY_VEHICLE);
    setRegistrationStage('personal');
    setPasswordResetRequested(false);
    setFieldErrors({});
    setFormError('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', whatsapp: '', cpf: '', addressCep: '', addressStreet: '', addressNumber: '', addressCity: '', addressState: '', cnpj: '', latitude: null, longitude: null, locationSource: 'city_center', vehicleTypes: [] });
  };

  const keepFocusedFieldVisible = (event) => {
    const field = event.target;
    if (!field?.matches?.('input, textarea, [role="combobox"]')) return;
    const reveal = () => field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    window.setTimeout(reveal, 320);
    window.setTimeout(reveal, 700);
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-background">
      <header className="safe-header sticky top-0 z-50 w-full border-b border-border bg-card/95 px-3 py-3 shadow-sm backdrop-blur-md sm:px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="container mx-auto grid min-h-12 w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onBackToLanding} className="justify-self-start" aria-label="Voltar para o site" title="Voltar para o site">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandLogo as="h1" className="min-w-0 justify-self-center" iconClassName="h-11 w-11 rounded-xl sm:h-12 sm:w-12" textClassName="text-xl sm:text-3xl" />
          <ThemeToggle className="justify-self-end" />
        </motion.div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pt-6">
        <p className="mb-4 max-w-xl text-center text-sm text-muted-foreground sm:mb-6 sm:text-base">Conectamos quem procura peças às empresas que querem vender em todo o Brasil.</p>
      <motion.div onFocusCapture={keepFocusedFieldVisible} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md scroll-mt-24">
        <Card className="w-full bg-card border border-border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl font-heading font-bold text-foreground">
              {userType === 'user' && <Users className="inline-block h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary" />}
              {userType === 'company' && <Building2 className="inline-block h-5 w-5 sm:h-6 sm:w-6 mr-2 text-accent-agile" />}
              {cardTitle}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 'email'
                ? 'Informe seu email. Nós identificaremos se você já possui uma conta.'
                : (isLogin ? `Encontramos sua conta de ${userType === 'user' ? 'comprador' : 'vendedor'}.` : (isForgotPassword ? `Enviaremos as instruções para ${formData.email}.` : (isConfirmation ? `Enviamos o link de confirmação para ${formData.email}.` : 'Ainda não há uma conta com este email. Preencha os dados abaixo para começar.')))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={userType} onValueChange={resetFlow} className="mb-4">
              <TabsList className="grid w-full grid-cols-2 bg-popover border border-border">
                <TabsTrigger value="user" className="text-xs sm:text-sm">Vou procurar</TabsTrigger>
                <TabsTrigger value="company" className="data-[state=active]:bg-accent-agile/15 data-[state=active]:text-accent-agile text-xs sm:text-sm">Vou vender</TabsTrigger>
              </TabsList>
            </Tabs>

            {collaboratorMode ? (
              <form onSubmit={async event => {
                event.preventDefault();
                setFormError('');
                if (!isValidCnpj(collaboratorForm.cnpj) || collaboratorForm.username.trim().length < 3 || !/^\d{6}$/.test(collaboratorForm.pin)) {
                  setFormError('Informe o CNPJ, o nome de usuário e o PIN de 6 números.');
                  return;
                }
                setIsSubmitting(true);
                const result = await onCollaboratorLogin(collaboratorForm);
                setIsSubmitting(false);
                if (!result?.success) setFormError(result?.error || 'Confira os dados de acesso.');
              }} className="space-y-4" noValidate>
                {formError && <p role="alert" className="rounded-lg border border-danger/30 bg-destructive/10 p-3 text-sm font-medium text-danger">{formError}</p>}
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm leading-5 text-muted-foreground">
                  Use os dados enviados ao seu email pelo responsável. A senha principal da empresa não é necessária.
                </div>
                <div><Label htmlFor="collaborator-cnpj">CNPJ da empresa</Label><Input id="collaborator-cnpj" inputMode="numeric" value={collaboratorForm.cnpj} onChange={event => setCollaboratorForm(current => ({ ...current, cnpj: event.target.value }))} placeholder="00.000.000/0000-00" autoFocus /></div>
                <div><Label htmlFor="collaborator-username">Nome de usuário</Label><Input id="collaborator-username" autoCapitalize="none" autoCorrect="off" value={collaboratorForm.username} onChange={event => setCollaboratorForm(current => ({ ...current, username: event.target.value.toLowerCase().replace(/\s/g, '') }))} placeholder="nome_sobrenome" /></div>
                <div><Label htmlFor="collaborator-pin">PIN de 6 números</Label><div className="relative min-w-0 overflow-hidden rounded-[10px]"><Input id="collaborator-pin" type={showCollaboratorPin ? 'text' : 'password'} style={{ WebkitTextSecurity: showCollaboratorPin ? 'none' : 'disc' }} inputMode="numeric" maxLength={6} value={collaboratorForm.pin} onChange={event => setCollaboratorForm(current => ({ ...current, pin: event.target.value.replace(/\D/g, '').slice(0, 6) }))} className="pr-12 tracking-[0.3em]" /><button type="button" onClick={() => setShowCollaboratorPin(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showCollaboratorPin ? 'Ocultar PIN' : 'Mostrar PIN'} aria-pressed={showCollaboratorPin}>{showCollaboratorPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}Entrar como colaborador</Button>
                <Button type="button" variant="outline" onClick={() => { setCollaboratorMode(false); setFormError(''); }} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao acesso principal</Button>
              </form>
            ) : isConfirmation ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 text-center space-y-3">
                <p className="text-sm text-foreground">Abra o email mais recente e confirme sua conta. O link retornará automaticamente para a Procuro Pra Ti.</p>
                <Button type="button" onClick={async () => {
                  setIsSubmitting(true);
                  await onResendConfirmation(formData.email);
                  setIsSubmitting(false);
                }} disabled={isSubmitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reenviar email de confirmação
                </Button>
                <Button type="button" variant="outline" onClick={() => resetFlow(userType)} className="w-full">Voltar para entrar</Button>
              </div>
            ) : isForgotPassword ? (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                {passwordResetRequested ? <>
                  <CheckCircle2 className="mx-auto h-10 w-10 text-accent-agile" />
                  <p className="font-semibold text-foreground">Confira seu email</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">Se este email estiver cadastrado, você receberá um link para criar uma nova senha.</p>
                </> : <>
                  <p className="text-sm leading-relaxed text-muted-foreground">Toque no botão abaixo. O link abrirá uma tela segura da Procuro Pra Ti para você definir uma nova senha.</p>
                  <Button type="button" disabled={isSubmitting} onClick={async () => {
                    setIsSubmitting(true);
                    const sent = await onRequestPasswordReset(formData.email);
                    setIsSubmitting(false);
                    if (sent) setPasswordResetRequested(true);
                  }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar link para redefinir senha
                  </Button>
                </>}
                <Button type="button" variant="outline" onClick={() => { setStep('password'); setPasswordResetRequested(false); }} className="w-full">Voltar para entrar</Button>
              </div>
            ) : <form onSubmit={handleSubmit} noValidate className="space-y-3">
              {formError && <p role="alert" className="rounded-lg border border-danger/30 bg-destructive/10 p-3 text-sm font-medium text-danger">{formError}</p>}
              {isRegistration && userType === 'user' && (
                <div className="rounded-lg border border-border bg-input/40 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Cadastro em 3 etapas</span><span>{({ personal: '1 de 3', address: '2 de 3', vehicle: '3 de 3' })[registrationStage]}</span></div>
                  <div className="grid grid-cols-3 gap-1.5" aria-label={`Etapa ${({ personal: '1', address: '2', vehicle: '3' })[registrationStage]} de 3`}>
                    {['personal', 'address', 'vehicle'].map((item, index) => <span key={item} className={`h-1.5 rounded-full ${index <= ['personal', 'address', 'vehicle'].indexOf(registrationStage) ? 'bg-primary' : 'bg-border'}`} />)}
                  </div>
                </div>
              )}
              {isRegistration && userType === 'company' && (
                <>
                  <CnpjLookup
                    value={formData.cnpj}
                    onChange={(cnpj) => { setFieldErrors(prev => ({ ...prev, cnpj: '' })); setFormError(''); setFormData(prev => ({ ...prev, cnpj })); }}
                    onCompanyFound={handleCompanyFound}
                    required
                    inputClassName="bg-popover border-border text-sm h-11"
                  />
                  <FieldError>{fieldErrors.cnpj}</FieldError>
                  <div>
                    <Label htmlFor="name" className="text-muted-foreground text-xs font-medium mb-1 block">Razão Social *</Label>
                    <Input id="name" name="name" type="text" placeholder="Razão social da empresa" required value={formData.name} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.name)} className={`bg-popover border-border text-sm h-11 ${fieldErrors.name ? 'border-danger' : ''}`} />
                    <FieldError>{fieldErrors.name}</FieldError>
                  </div>
                </>
              )}

              {isRegistration && userType === 'user' && registrationStage === 'personal' && (
                <div>
                  <Label htmlFor="name" className="text-muted-foreground text-xs font-medium mb-1 block">Nome Completo *</Label>
                  <Input id="name" name="name" type="text" placeholder="Seu nome completo" required value={formData.name} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.name)} className={`bg-popover border-border text-sm h-11 ${fieldErrors.name ? 'border-danger' : ''}`} />
                  <FieldError>{fieldErrors.name}</FieldError>
                </div>
              )}

              {(userType === 'company' || !isRegistration || registrationStage === 'personal') && <div>
                <Label htmlFor="email" className="text-muted-foreground text-xs font-medium mb-1 block">Email</Label>
                <Input id="email" name="email" type="email" placeholder="seu@email.com" required value={formData.email} onChange={handleInputChange} readOnly={step !== 'email'} aria-invalid={Boolean(fieldErrors.email)} className={`bg-popover border-border text-sm h-11 read-only:opacity-70 ${fieldErrors.email ? 'border-danger' : ''}`} autoFocus={step === 'email'} />
                <FieldError>{fieldErrors.email}</FieldError>
              </div>}

              {step !== 'email' && (userType === 'company' || !isRegistration || registrationStage === 'personal') && <div>
                <Label htmlFor="password" className="text-muted-foreground text-xs font-medium mb-1 block">Senha</Label>
                <div className="relative min-w-0 overflow-hidden rounded-[10px]">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder={isLogin ? "Digite sua senha" : "Crie uma senha"} required value={formData.password} onChange={handleInputChange} aria-describedby={isRegistration ? 'passwordRequirements' : undefined} aria-invalid={Boolean(fieldErrors.password) || (isRegistration && formData.password.length > 0 && !isPasswordValid)} className={`bg-popover border-border pr-12 text-sm h-11 ${fieldErrors.password ? 'border-danger' : ''}`} autoFocus />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError>{fieldErrors.password}</FieldError>
                {isRegistration && (
                  <div id="passwordRequirements" className="mt-2 grid gap-1.5 rounded-lg border border-border bg-input/40 p-3" aria-live="polite">
                    <p className="mb-0.5 text-xs font-medium text-foreground">Sua senha precisa ter:</p>
                    {passwordRules.map(rule => (
                      <p key={rule.label} className={`flex items-center gap-2 text-xs ${rule.valid ? 'text-accent-agile' : 'text-muted-foreground'}`}>
                        {rule.valid ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                        {rule.label}
                      </p>
                    ))}
                  </div>
                )}
                {isLogin && <button type="button" onClick={() => { setStep('forgot-password'); setFormError(''); setFieldErrors({}); }} className="mt-2 min-h-8 text-sm font-semibold text-primary hover:underline">Esqueci minha senha</button>}
              </div>}

              {isRegistration && (userType === 'company' || registrationStage === 'personal') && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs font-medium mb-1 block">Confirmar Senha</Label>
                  <div className="relative min-w-0 overflow-hidden rounded-[10px]">
                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} style={{ WebkitTextSecurity: showConfirmPassword ? 'none' : 'disc' }} autoComplete="new-password" placeholder="Confirme sua senha" required value={formData.confirmPassword} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.confirmPassword) || (formData.confirmPassword.length > 0 && !passwordsMatch)} className={`bg-popover border-border pr-12 text-sm h-11 ${fieldErrors.confirmPassword ? 'border-danger' : ''}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(value => !value)} className="touch-manipulation absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={showConfirmPassword}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  <p className={`mt-1.5 flex items-center gap-2 text-xs ${passwordsMatch ? 'text-accent-agile' : formData.confirmPassword ? 'text-danger' : 'text-muted-foreground'}`} aria-live="polite">
                    {passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {passwordsMatch ? 'As senhas são iguais.' : formData.confirmPassword ? 'As senhas não são iguais.' : 'Repita a mesma senha.'}
                  </p>
                </div>
              )}

              {isRegistration && userType === 'company' && (
                <>
                  <CepAddressLookup
                    value={formData.addressCep}
                    onChange={(addressCep) => { setFieldErrors(prev => ({ ...prev, addressCep: '' })); setFormError(''); setFormData(prev => ({ ...prev, addressCep })); }}
                    onAddressFound={handleAddressFound}
                    required
                    inputClassName="bg-popover border-border text-sm h-11"
                  />
                  <FieldError>{fieldErrors.addressCep}</FieldError>
                  <div>
                    <Label htmlFor="addressStreet" className="text-muted-foreground text-xs font-medium mb-1 block">Rua e bairro *</Label>
                    <Input id="addressStreet" name="addressStreet" type="text" placeholder="Ex: Rua Principal, Centro" value={formData.addressStreet} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.addressStreet)} className={`bg-popover border-border text-sm h-11 ${fieldErrors.addressStreet ? 'border-danger' : ''}`}/>
                    <FieldError>{fieldErrors.addressStreet}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="addressNumber" className="text-muted-foreground text-xs font-medium mb-1 block">Número da empresa *</Label>
                    <Input id="addressNumber" name="addressNumber" type="text" inputMode="text" autoComplete="address-line2" placeholder="Ex: 123 ou S/N" value={formData.addressNumber} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.addressNumber)} className={`bg-popover border-border text-sm h-11 ${fieldErrors.addressNumber ? 'border-danger' : ''}`}/>
                    <FieldError>{fieldErrors.addressNumber}</FieldError>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addressState" className="text-muted-foreground text-xs font-medium mb-1 block">Estado *</Label>
                      <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                      <SelectTrigger id="addressState" aria-invalid={Boolean(fieldErrors.addressState)} className={`bg-popover border-border w-full text-sm h-11 ${fieldErrors.addressState ? 'border-danger' : ''}`}><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FieldError>{fieldErrors.addressState}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="addressCity" className="text-muted-foreground text-xs font-medium mb-1 block">Cidade *</Label>
                      <CityCombobox id="addressCity" value={formData.addressCity} onChange={(value) => handleSelectChange('addressCity', value)} options={availableCities} placeholder="Cidade" disabled={!formData.addressState || availableCities.length === 0} className={fieldErrors.addressCity ? 'border-danger' : 'bg-popover'} />
                      <FieldError>{fieldErrors.addressCity}</FieldError>
                    </div>
                  </div>
                </>
              )}

              {isRegistration && (userType === 'company' || registrationStage === 'personal') && (
                <div>
                  <Label htmlFor="phone" className="text-muted-foreground text-xs font-medium mb-1 block">{userType === 'company' ? 'Telefone da empresa' : 'Telefone (Opcional)'}</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="(XX) XXXXX-XXXX" value={formData.phone} onChange={handleInputChange} className="bg-popover border-border text-sm h-11" />
                </div>
              )}
              {isRegistration && userType === 'company' && (
                <div>
                  <Label htmlFor="whatsapp" className="text-muted-foreground text-xs font-medium mb-1 block">WhatsApp</Label>
                  <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(XX) XXXXX-XXXX" value={formData.whatsapp} onChange={handleInputChange} className="bg-popover border-border text-sm h-11" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Este número será identificado como WhatsApp para o comprador.</p>
                </div>
              )}
              {isRegistration && userType === 'company' && (
                <div id="vehicleTypesSection" tabIndex="-1" className={`space-y-2 rounded-xl border bg-input/30 p-3 ${fieldErrors.vehicleTypes ? 'border-danger ring-1 ring-danger' : 'border-border'}`}>
                  <div>
                    <Label className="text-sm font-semibold text-foreground">Para quais veículos sua empresa vende peças? *</Label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Última etapa. Você receberá somente procuras compatíveis com as opções selecionadas e com sua região.</p>
                  </div>
                  <VehicleTypeSelector value={formData.vehicleTypes} onChange={(vehicleTypes) => { setFieldErrors(prev => ({ ...prev, vehicleTypes: '' })); setFormData(prev => ({ ...prev, vehicleTypes })); }} idPrefix="registration-company-vehicle-types" />
                  <FieldError>{fieldErrors.vehicleTypes}</FieldError>
                </div>
              )}
              {userType === 'user' && isRegistration && registrationStage === 'vehicle' && (
                <div id="registrationVehicleSection" tabIndex="-1" className={`rounded-lg border p-3 space-y-2 ${fieldErrors.vehicle ? 'border-danger ring-1 ring-danger' : 'border-border'}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">Meu veículo (opcional)</p>
                    <p className="text-xs text-muted-foreground">Cadastre agora para facilitar suas próximas procuras.</p>
                  </div>
                  <VehicleSelector value={vehicle} onChange={setVehicle} idPrefix="registration-vehicle" />
                  <FieldError>{fieldErrors.vehicle}</FieldError>
                </div>
              )}
              {userType === 'user' && isRegistration && registrationStage === 'address' && (
                <>
                  <p className="text-xs text-muted-foreground pt-1">Informe seu endereço para que suas procuras já comecem na sua cidade.</p>
                  <CepAddressLookup
                    value={formData.addressCep}
                    onChange={(addressCep) => { setFieldErrors(prev => ({ ...prev, addressCep: '' })); setFormError(''); setFormData(prev => ({ ...prev, addressCep })); }}
                    onAddressFound={handleAddressFound}
                    required
                    inputClassName="bg-popover border-border text-sm h-11"
                  />
                  <FieldError>{fieldErrors.addressCep}</FieldError>
                  <div>
                    <Label htmlFor="addressStreetUser" className="text-muted-foreground text-xs font-medium mb-1 block">Rua e bairro *</Label>
                    <Input id="addressStreetUser" name="addressStreet" type="text" placeholder="Ex: Rua das Flores, Centro" value={formData.addressStreet} onChange={handleInputChange} aria-invalid={Boolean(fieldErrors.addressStreet)} className={`bg-popover border-border text-sm h-11 ${fieldErrors.addressStreet ? 'border-danger' : ''}`}/>
                    <FieldError>{fieldErrors.addressStreet}</FieldError>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addressStateUser" className="text-muted-foreground text-xs font-medium mb-1 block">Estado *</Label>
                      <Select value={formData.addressState} onValueChange={(value) => handleSelectChange('addressState', value)}>
                      <SelectTrigger id="addressStateUser" aria-invalid={Boolean(fieldErrors.addressState)} className={`bg-popover border-border w-full text-sm h-11 ${fieldErrors.addressState ? 'border-danger' : ''}`}><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground max-h-48">{sortedStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FieldError>{fieldErrors.addressState}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="addressCityUser" className="text-muted-foreground text-xs font-medium mb-1 block">Cidade *</Label>
                      <CityCombobox id="addressCityUser" value={formData.addressCity} onChange={(value) => handleSelectChange('addressCity', value)} options={availableCities} placeholder="Cidade" disabled={!formData.addressState || availableCities.length === 0} className={fieldErrors.addressCity ? 'border-danger' : 'bg-popover'} />
                      <FieldError>{fieldErrors.addressCity}</FieldError>
                    </div>
                  </div>
                </>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-semibold py-2.5 text-sm h-10 ${isCompanyIntent ? 'bg-accent-agile hover:bg-accent-agile/90 text-accent-agile-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (step === 'email' ? <ArrowRight className="h-4 w-4 mr-2" /> : (isLogin ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />))}
                {isSubmitting ? 'Aguarde...' : buttonText}
              </Button>
              {userType === 'company' && !isRegistration && (
                <Button type="button" variant="outline" onClick={() => { setCollaboratorMode(true); setFormError(''); }} className="w-full border-primary/40 text-primary">
                  <KeyRound className="mr-2 h-4 w-4" />Sou colaborador
                </Button>
              )}
              {step !== 'email' && (
                <Button type="button" variant="ghost" onClick={() => resetFlow(userType)} className="w-full text-xs text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Alterar email
                </Button>
              )}
            </form>}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-3">
            <Button variant="link" onClick={() => setShowTerms(true)} className="min-h-11 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1">
              <FileText className="h-3 w-3" />
              Termos de Uso
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
      </main>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} userType={userType} />
    </div>
  );
};

export default UserRegistration;
