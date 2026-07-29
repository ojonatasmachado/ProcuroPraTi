
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Car, MapPin, Send, Camera, Upload, ListFilter, History, Edit3, CheckCircle2, XCircle, ArrowLeft, Bike, Truck, Bus, SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getSearchRemainingMs } from '@/lib/searchDuration';
import BrandMark from '@/components/BrandMark';
import { distanceInKm } from '@/lib/geocoding';
import useScrollToTop from '@/hooks/useScrollToTop';
import { formatCurrency, formatCurrencyInput, normalizeCurrencyValue, sanitizeCurrencyInput } from '@/lib/currency';
import DashboardSectionTabs from '@/components/DashboardSectionTabs';
import { SubscriptionBlockedDialog } from '@/components/CompanyTrialExperience';
import RemainingTimeBadge from '@/components/RemainingTimeBadge';

const getPartNameSizeClass = (name) => {
  const length = (name || '').length;
  if (length <= 14) return 'text-lg';
  if (length <= 24) return 'text-base';
  return 'text-sm';
};

const PART_CONDITION_LABELS = {
  new: '🆕 Nova (sem uso)',
  excellent: '⭐ Excelente (quase nova)',
  good: '👍 Boa (pequenos desgastes)',
  fair: '⚠️ Regular (desgastes visíveis)',
  poor: '🔧 Ruim (precisa reparo)',
};
const PART_TYPE_LABELS = {
  original: '🔩 Original',
  parallel: '⚙️ Paralela',
};
const RESPONSE_STEP_NAMES = { 1: 'Preço', 2: 'Condição, tipo e foto', 3: 'Revisão' };

const CompanyDashboard = ({ allProcuras = [], companyResponses = [], onResponseSubmit, onPhotoUpload, currentUser, vehicleData, users = [], openProcuraId = null, onPushDestinationHandled, isDataLoaded = false, subscriptionContext = null, onShowPlans }) => {
  const [selectedProcura, setSelectedProcura] = useState(null);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [responseStep, setResponseStep] = useState(1);
  const [responseForm, setResponseForm] = useState({
    status: '',
    partCondition: '',
    partType: '',
    price: '',
    message: '',
    photoUrl: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [filterPartName, setFilterPartName] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const fileInputRef = useRef(null);
  const [currentView, setCurrentView] = useState('to-respond');
  const [returnView, setReturnView] = useState('to-respond');
  const [showFilters, setShowFilters] = useState(false);
  const [showPhotoConfirmDialog, setShowPhotoConfirmDialog] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseErrors, setResponseErrors] = useState({});
  const [showSubscriptionBlock, setShowSubscriptionBlock] = useState(false);
  useScrollToTop(currentView);

  useEffect(() => {
    if (!openProcuraId || !isDataLoaded) return undefined;
    const targetIsVisible = allProcuras.some(procura => procura.id === openProcuraId)
      || companyResponses.some(procura => procura.id === openProcuraId);
    if (!targetIsVisible) return undefined;
    const alreadyResponded = companyResponses.some(procura => procura.id === openProcuraId);
    setCurrentView(alreadyResponded ? 'responded' : 'to-respond');

    const timer = window.setTimeout(() => {
      document.getElementById(`procura-${openProcuraId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onPushDestinationHandled?.();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [openProcuraId, companyResponses, allProcuras, onPushDestinationHandled, isDataLoaded]);

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const temporaryUrl = URL.createObjectURL(file);
      setPhotoPreview(temporaryUrl);
      setIsUploadingPhoto(true);
      try {
        const publicUrl = await onPhotoUpload(file);
        setPhotoPreview(publicUrl);
        setResponseForm(prev => ({ ...prev, photoUrl: publicUrl }));
        toast({ title: "Foto enviada", description: "A imagem foi salva com segurança." });
      } catch (error) {
        setPhotoPreview(null);
        toast({ title: "Não foi possível enviar a foto", description: error.message, variant: "destructive" });
      } finally {
        URL.revokeObjectURL(temporaryUrl);
        setIsUploadingPhoto(false);
        event.target.value = '';
      }
    }
  };

  const focusFirstError = (errors) => {
    const firstError = Object.keys(errors)[0];
    if (!firstError) return;
    window.requestAnimationFrame(() => {
      const field = document.getElementById(`response-${firstError}`) || document.getElementById(firstError);
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => field?.focus?.(), 250);
    });
    toast({ title: 'Revise a resposta', description: errors[firstError], variant: 'destructive' });
  };

  const validateStep1 = () => {
    const errors = {};
    const normalizedPrice = Number(normalizeCurrencyValue(responseForm.price));
    if (responseForm.status === 'available' && (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0)) errors.price = 'Informe um preço válido, incluindo os centavos.';
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    if (responseForm.status === 'available' && !responseForm.partCondition) errors.partCondition = 'Selecione a condição da peça.';
    if (responseForm.status === 'available' && !responseForm.partType) errors.partType = 'Selecione se a peça é original ou paralela.';
    return errors;
  };

  const handleStep1Continue = () => {
    const errors = validateStep1();
    setResponseErrors(errors);
    if (Object.keys(errors).length) { focusFirstError(errors); return; }
    setResponseStep(2);
  };

  const handleStep2Continue = () => {
    const errors = validateStep2();
    setResponseErrors(errors);
    if (Object.keys(errors).length) { focusFirstError(errors); return; }
    if (selectedProcura.wantsPhotos && responseForm.status === 'available' && !responseForm.photoUrl) {
      setShowPhotoConfirmDialog(true);
      return;
    }
    setResponseStep(3);
  };

  const submitResponse = async () => {
    if (!selectedProcura || isSubmittingResponse) return;
    setIsSubmittingResponse(true);
    const response = {
      id: isEditingResponse ? selectedProcura.myResponse.id : Date.now().toString(),
      searchId: selectedProcura.id,
      companyId: currentUser.id,
      companyName: currentUser.name,
      responseDate: new Date().toISOString(),
      ...responseForm,
      price: responseForm.status === 'available' && responseForm.price !== '' ? normalizeCurrencyValue(responseForm.price) : null,
      message: responseForm.status === 'unavailable' ? 'Peça indisponível no momento.' : responseForm.message,
      cnpj: currentUser.cnpj,
      address: currentUser.address,
      location: currentUser.address.split(',').slice(-2).join(',').trim(),
      isReadByUser: false,
      isReadByCompany: true,
      // A tela de confirmação do wizard já avisa; evita duplicar com o toast.
      skipToast: true,
    };

    try {
      const saved = await onResponseSubmit(selectedProcura.id, response);
      if (!saved) return;
      setShowPhotoConfirmDialog(false);
      setCurrentView('response_success');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const finishResponseFlow = () => {
    const wasEditing = isEditingResponse;
    setResponseForm({ status: '', partCondition: '', partType: '', price: '', message: '', photoUrl: '' });
    setResponseErrors({});
    setPhotoPreview(null);
    setSelectedProcura(null);
    setIsEditingResponse(false);
    setResponseStep(1);
    setCurrentView(wasEditing ? 'responded' : 'to-respond');
  };

  useEffect(() => {
    if (currentView !== 'response_success') return undefined;
    const timer = window.setTimeout(() => finishResponseFlow(), 5000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const handleQuickResponse = async (procura, hasItem) => {
    if (subscriptionContext && !subscriptionContext.canRespond) {
      setShowSubscriptionBlock(true);
      return;
    }
    if (hasItem) {
      handleSelectProcura(procura, false);
    } else {
      if (isSubmittingResponse) return;
      setIsSubmittingResponse(true);
      const response = {
        id: Date.now().toString(),
        searchId: procura.id,
        companyId: currentUser.id,
        companyName: currentUser.name,
        responseDate: new Date().toISOString(),
        status: 'unavailable',
        partCondition: null,
        partType: null,
        price: null,
        message: 'Peça indisponível no momento.',
        photoUrl: null,
        cnpj: currentUser.cnpj,
        address: currentUser.address,
        location: currentUser.address.split(',').slice(-2).join(',').trim(),
        isReadByUser: false,
        isReadByCompany: true,
      };

      try {
        const saved = await onResponseSubmit(procura.id, response);
        if (saved) {
          setCurrentView('to-respond');
          toast({ title: "Resposta enviada!", description: "Informamos que a peça não está disponível. Continue respondendo às procuras abertas." });
        }
      } finally {
        setIsSubmittingResponse(false);
      }
    }
  };

  const handleSelectProcura = (procura, isEdit = false) => {
    if (!isEdit && subscriptionContext && !subscriptionContext.canRespond) {
      setShowSubscriptionBlock(true);
      return;
    }
    setReturnView(isEdit ? 'responded' : 'to-respond');
    setResponseErrors({});
    setResponseStep(1);
    setSelectedProcura(procura);
    setIsEditingResponse(isEdit);
    if (isEdit && procura.myResponse) {
      setResponseForm({
        status: procura.myResponse.status || '', 
        partCondition: procura.myResponse.partCondition || '',
        partType: procura.myResponse.partType || '',
        price: formatCurrencyInput(procura.myResponse.price),
        message: procura.myResponse.message || '',
        photoUrl: procura.myResponse.photoUrl || ''
      });
      if (procura.myResponse.photoUrl) setPhotoPreview(procura.myResponse.photoUrl);
    } else {
       setResponseForm({ status: 'available', partCondition: '', partType: '', price: '', message: '', photoUrl: '' });
       setPhotoPreview(null);
    }
    setCurrentView('response_form');
  };

  const getTimeRemaining = (procura) => {
    const remaining = getSearchRemainingMs(procura);
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return { days, hours, minutes, expired: false };
  };

  const filteredProcurasToRespond = useMemo(() => {
    return (allProcuras || [])
      .filter(p => !(companyResponses || []).some(myRes => myRes.id === p.id))
      .filter(p => {
        const partNameMatch = filterPartName ? (p.partName || '').toLowerCase().includes(filterPartName.toLowerCase()) : true;
        const vehicleMatch = filterVehicle ? 
          `${p.vehicleBrand} ${p.vehicleModel} ${p.vehicleYear}`.toLowerCase().includes(filterVehicle.toLowerCase()) : true;
        return partNameMatch && vehicleMatch;
      }).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [allProcuras, companyResponses, filterPartName, filterVehicle]);

  const filteredCompanyResponses = useMemo(() => {
    return (companyResponses || []).filter(p => {
      const partNameMatch = filterPartName ? (p.partName || '').toLowerCase().includes(filterPartName.toLowerCase()) : true;
      const vehicleMatch = filterVehicle ? 
        `${p.vehicleBrand} ${p.vehicleModel} ${p.vehicleYear}`.toLowerCase().includes(filterVehicle.toLowerCase()) : true;
      return partNameMatch && vehicleMatch;
    }).sort((a,b) => new Date(b.myResponse.responseDate) - new Date(a.myResponse.responseDate));
  }, [companyResponses, filterPartName, filterVehicle]);

  const getVehicleIcon = (type) => {
    if (type === 'motorcycle') return <Bike className="h-3 w-3" />;
    if (type === 'truck') return <Truck className="h-3 w-3" />;
    if (type === 'bus') return <Bus className="h-3 w-3" />;
    return <Car className="h-3 w-3" />;
  };

  const renderCompactProcuraCard = (procura, type = 'to-respond') => {
    const hasResponded = type === 'responded';
    const response = procura.myResponse;
    const distance = distanceInKm({ latitude: currentUser.latitude, longitude: currentUser.longitude }, { latitude: procura.searchLatitude, longitude: procura.searchLongitude });
    const isAvailable = response?.status === 'available';
    return (
      <Card key={procura.id} id={`procura-${procura.id}`} className={`overflow-hidden border-border border-l-[3px] bg-card shadow-sm ${hasResponded ? isAvailable ? 'border-l-accent-agile' : 'border-l-muted-foreground' : 'border-l-primary'}`}>
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className={`truncate font-bold text-foreground ${getPartNameSizeClass(procura.partName)}`}>{procura.partName}</p>
            {hasResponded ? (
              <Badge className={`shrink-0 text-[10px] font-extrabold ${isAvailable ? 'border-transparent bg-accent-agile text-accent-agile-foreground' : 'bg-secondary text-muted-foreground'}`}>{isAvailable ? 'Tenho' : 'Não tenho'}</Badge>
            ) : (
              <RemainingTimeBadge procura={procura} compact />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 truncate text-xs text-muted-foreground">
            {getVehicleIcon(procura.vehicleType)}
            <span className="truncate">{procura.vehicleBrand} {procura.vehicleModel} {procura.vehicleYear ? `(${procura.vehicleYear})` : ''}</span>
            {distance !== null && <span className="shrink-0">· {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(0)} km`}</span>}
            {hasResponded && isAvailable && response?.price != null && <span className="shrink-0 font-bold text-foreground">· {formatCurrency(response.price)}</span>}
            {hasResponded && <span className={`shrink-0 ${response?.isReadByUser ? 'text-accent-agile' : 'text-warning'}`}>· {response?.isReadByUser ? 'Visualizada' : 'Aguardando visualização'}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {hasResponded ? (
              <Button onClick={() => handleSelectProcura(procura, true)} className="col-span-2 h-9 bg-primary text-xs font-bold text-primary-foreground"><Edit3 className="mr-1.5 h-3.5 w-3.5" />Editar resposta</Button>
            ) : (
              <>
                <Button onClick={() => handleQuickResponse(procura, true)} disabled={isSubmittingResponse} className="h-9 bg-accent-agile px-2 text-xs font-bold text-accent-agile-foreground hover:bg-accent-agile/90"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />Tenho</Button>
                <Button onClick={() => handleQuickResponse(procura, false)} disabled={isSubmittingResponse} variant="outline" className="h-9 border-danger/60 px-2 text-xs font-bold text-danger hover:bg-destructive hover:text-destructive-foreground"><XCircle className="mr-1.5 h-3.5 w-3.5 shrink-0" />Não tenho</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (currentView === 'response_success' && selectedProcura) {
    const successPrice = responseForm.status === 'available' && responseForm.price ? `R$ ${responseForm.price}` : null;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="mx-auto max-w-md">
        <Card className="glass-effect border-accent-agile/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <motion.span
              initial={{ scale: 0.4 }}
              animate={{ scale: [0.4, 1.08, 1] }}
              transition={{ duration: 0.4 }}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent-agile text-accent-agile"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Resposta enviada!</h2>
              <p className="mt-1 text-sm text-muted-foreground">O comprador foi avisado. {selectedProcura.partName}{successPrice ? ` · ${successPrice}` : ''}</p>
            </div>
            <Button onClick={finishResponseFlow} className="mt-2 w-full gradient-bg text-primary-foreground hover:opacity-90">Continuar respondendo</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (currentView === 'response_form' && selectedProcura) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Card className="glass-effect border-primary/30 max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                {responseStep > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setResponseStep(step => step - 1)} aria-label="Etapa anterior" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="truncate text-foreground text-lg sm:text-xl">Responder procura</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSelectedProcura(null); setIsEditingResponse(false); setResponseStep(1); setCurrentView(returnView); }} className="shrink-0 border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">Sair</Button>
            </div>
            <div className="text-muted-foreground text-sm">{selectedProcura.partName} · {selectedProcura.vehicleType} {selectedProcura.vehicleBrand} {selectedProcura.vehicleModel} ({selectedProcura.vehicleYear || 'N/A'})</div>
            {selectedProcura.wantsPhotos && <Badge variant="outline" className="border-warning text-warning flex items-center gap-1 w-fit"><Camera className="h-4 w-4" /> Usuário solicitou fotos</Badge>}
            <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label={`Etapa ${responseStep} de 3`}>
              {[1, 2, 3].map(step => <span key={step} className={`h-1.5 rounded-full ${step <= responseStep ? 'bg-primary' : 'bg-border'}`} />)}
            </div>
            <p className="text-xs font-medium text-muted-foreground">Etapa {responseStep} de 3 · {RESPONSE_STEP_NAMES[responseStep]}</p>
          </CardHeader>
          <CardContent>
            {responseStep === 1 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 bg-input/50 rounded-lg text-sm">
                  <h3 className="font-semibold mb-1 text-foreground">Detalhes da Procura:</h3>
                  {selectedProcura.partDescription && <p className="text-muted-foreground mb-1">{selectedProcura.partDescription}</p>}
                  {selectedProcura.referencePhotoUrl && <a href={selectedProcura.referencePhotoUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-[10px] border border-border bg-muted p-1" aria-label="Abrir foto de referência em tamanho maior"><img src={selectedProcura.referencePhotoUrl} alt="Foto de referência enviada pelo comprador" className="max-h-72 w-full rounded-lg object-contain" /><span className="block py-1 text-center text-xs font-medium text-primary">Abrir imagem em tamanho maior</span></a>}
                  {(selectedProcura.locations || []).length > 0 && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {(selectedProcura.locations || []).map(l => l.label).join(', ')}</p>}
                </div>
                <div>
                  <Label htmlFor="response-price" className="block text-sm font-medium mb-2 text-muted-foreground">Preço (R$) *</Label>
                  <Input id="response-price" type="text" inputMode="decimal" placeholder="Ex: 250,00" autoFocus value={responseForm.price} onChange={(e) => { setResponseForm({...responseForm, price: sanitizeCurrencyInput(e.target.value)}); setResponseErrors(current => ({ ...current, price: '' })); }} onBlur={(e) => setResponseForm(current => ({ ...current, price: formatCurrencyInput(e.target.value) }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleStep1Continue(); } }} aria-invalid={Boolean(responseErrors.price)} className={`bg-input ${responseErrors.price ? 'border-danger ring-1 ring-danger' : 'border-border'}`}/>
                  {responseErrors.price && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.price}</p>}
                </div>
                <Button type="button" onClick={handleStep1Continue} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3">Continuar</Button>
              </div>
            )}

            {responseStep === 2 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="response-partCondition" className="block text-sm font-medium mb-2 text-muted-foreground">Condição da Peça *</Label>
                    <Select value={responseForm.partCondition} onValueChange={(value) => { setResponseForm({...responseForm, partCondition: value}); setResponseErrors(current => ({ ...current, partCondition: '' })); }}>
                      <SelectTrigger id="response-partCondition" aria-invalid={Boolean(responseErrors.partCondition)} className={`bg-input ${responseErrors.partCondition ? 'border-danger ring-1 ring-danger' : 'border-border'}`}><SelectValue placeholder="Selecione a condição" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        {Object.entries(PART_CONDITION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {responseErrors.partCondition && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.partCondition}</p>}
                  </div>
                  <div>
                    <Label htmlFor="response-partType" className="block text-sm font-medium mb-2 text-muted-foreground">Tipo da Peça *</Label>
                    <Select value={responseForm.partType} onValueChange={(value) => { setResponseForm({...responseForm, partType: value}); setResponseErrors(current => ({ ...current, partType: '' })); }}>
                      <SelectTrigger id="response-partType" aria-invalid={Boolean(responseErrors.partType)} className={`bg-input ${responseErrors.partType ? 'border-danger ring-1 ring-danger' : 'border-border'}`}><SelectValue placeholder="Original ou Paralela" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        {Object.entries(PART_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {responseErrors.partType && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.partType}</p>}
                  </div>
                </div>

                {selectedProcura.wantsPhotos && (
                  <div>
                    <Label className="block text-sm font-medium mb-2 text-muted-foreground">Foto da Peça</Label>
                    <Button type="button" variant="outline" onClick={handlePhotoUpload} disabled={isUploadingPhoto} className="w-full border-primary text-primary"><Upload className={`mr-2 h-4 w-4 ${isUploadingPhoto ? 'animate-pulse' : ''}`}/> {isUploadingPhoto ? 'Enviando foto...' : 'Adicionar foto'}</Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <p className="mt-1 text-xs text-muted-foreground">A imagem será otimizada automaticamente para manter os detalhes sem ocupar espaço desnecessário.</p>
                    {photoPreview && <div className="mt-2"><img src={photoPreview} alt="Pré-visualização da peça" className="max-h-32 rounded-md border border-border" /></div>}
                  </div>
                )}
                <div>
                  <Label htmlFor="message" className="block text-sm font-medium mb-2 text-muted-foreground">Mensagem Adicional</Label>
                  <Textarea
                    id="message"
                    placeholder="Informações adicionais (ex: garantia, observações, etc.)"
                    value={responseForm.message}
                    onChange={(e) => setResponseForm({...responseForm, message: e.target.value})}
                    className="bg-input border-border"
                    rows={2}
                  />
                </div>
                <Button type="button" onClick={handleStep2Continue} disabled={isUploadingPhoto} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3">Continuar</Button>
              </div>
            )}

            {responseStep === 3 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2 rounded-lg border border-border bg-input/30 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Peça</span><span className="text-right font-semibold text-foreground">{selectedProcura.partName}</span></div>
                  {responseForm.status === 'available' && (
                    <>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Preço</span><span className="text-right font-semibold text-foreground">R$ {responseForm.price || '—'}</span></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Condição</span><span className="text-right font-medium text-foreground">{PART_CONDITION_LABELS[responseForm.partCondition] || '—'}</span></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Tipo</span><span className="text-right font-medium text-foreground">{PART_TYPE_LABELS[responseForm.partType] || '—'}</span></div>
                      {selectedProcura.wantsPhotos && <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Foto</span><span className="text-right font-medium text-foreground">{responseForm.photoUrl ? 'Anexada' : 'Sem foto'}</span></div>}
                    </>
                  )}
                  {responseForm.message && <p className="border-t border-border pt-2 text-muted-foreground">“{responseForm.message}”</p>}
                </div>
                <Button type="button" onClick={() => void submitResponse()} disabled={isSubmittingResponse || isUploadingPhoto} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3" aria-live="polite">
                  {isSubmittingResponse ? <><span className="mr-2 inline-flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" /></span>Enviando resposta</> : <><Send className="h-5 w-5 mr-2" /> {isEditingResponse ? 'Atualizar Resposta' : 'Enviar resposta'}</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showPhotoConfirmDialog} onOpenChange={setShowPhotoConfirmDialog}>
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground flex items-center gap-2">
                <Camera className="h-6 w-6" />
                Responder sem foto?
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                O usuário solicitou fotos da peça, mas você não adicionou nenhuma imagem. Deseja continuar sem foto?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPhotoConfirmDialog(false)} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
                Cancelar e Adicionar Foto
              </Button>
              <Button onClick={() => { setShowPhotoConfirmDialog(false); setResponseStep(3); }} className="gradient-bg hover:opacity-90 text-primary-foreground">
                Sim, continuar sem foto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  const hasActiveFilters = Boolean(filterPartName || filterVehicle);
  const clearFilters = () => { setFilterPartName(''); setFilterVehicle(''); };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-20">
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{currentView === 'responded' ? 'Procuras respondidas' : 'Procuras para responder'}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{currentView === 'responded' ? 'Revise ou edite as respostas que você enviou.' : 'Responda primeiro às oportunidades que sua empresa pode atender.'}</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(value => !value)} className={`relative min-h-10 shrink-0 px-3 ${showFilters || hasActiveFilters ? 'border-primary text-primary' : ''}`} aria-expanded={showFilters} aria-controls="company-search-filters"><SlidersHorizontal className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Filtros</span>{hasActiveFilters && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-agile ring-2 ring-background" />}</Button>
            </div>
            <DashboardSectionTabs value={currentView} onChange={setCurrentView} items={[{ value: 'to-respond', label: 'Ativas', count: filteredProcurasToRespond.length, icon: ListFilter }, { value: 'responded', label: 'Respondidas', count: filteredCompanyResponses.length, icon: History }]} />
            {showFilters && <Card id="company-search-filters" className="mb-4 mt-3 border-border bg-card shadow-sm"><CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"><div><Label htmlFor="filterPartName" className="mb-1.5 block text-xs text-muted-foreground">Nome da peça</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="filterPartName" placeholder="Ex: Farol, motor..." value={filterPartName} onChange={(e) => setFilterPartName(e.target.value)} className="min-h-11 bg-input pl-9 text-sm" /></div></div><div><Label htmlFor="filterVehicle" className="mb-1.5 block text-xs text-muted-foreground">Marca, modelo ou ano</Label><div className="relative"><Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="filterVehicle" placeholder="Ex: Fiat Palio 2010..." value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} className="min-h-11 bg-input pl-9 text-sm" /></div></div>{hasActiveFilters && <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="justify-self-start text-muted-foreground sm:col-span-2"><RotateCcw className="mr-2 h-4 w-4" />Limpar filtros</Button>}</CardContent></Card>}
            <TabsContent value="to-respond">
              {filteredProcurasToRespond.length === 0 ? (<Card className="border-border bg-card"><CardContent className="py-10 text-center"><BrandMark className="mx-auto mb-3 h-12 w-12 rounded-xl" /><p className="font-semibold text-foreground">{hasActiveFilters ? 'Nenhuma procura encontrada.' : 'Nenhuma procura aguardando resposta.'}</p><p className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? 'Limpe ou altere os filtros para ver outras procuras.' : 'Quando houver oportunidades na sua região, elas aparecerão aqui.'}</p></CardContent></Card>)
              : (<div className="mx-auto max-w-3xl">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{filteredProcurasToRespond.length} aguardando resposta</span></div>
                  <div className="grid grid-cols-1 gap-2">{filteredProcurasToRespond.map(procura => renderCompactProcuraCard(procura, 'to-respond'))}</div>
                </div>)}
            </TabsContent>
            <TabsContent value="responded">
               {filteredCompanyResponses.length === 0 ? (<Card className="border-border bg-card"><CardContent className="py-10 text-center"><BrandMark className="mx-auto mb-3 h-12 w-12 rounded-xl" /><p className="font-semibold text-foreground">{hasActiveFilters ? 'Nenhuma resposta encontrada.' : 'Você ainda não respondeu nenhuma procura.'}</p><p className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? 'Limpe ou altere os filtros para ver outras respostas.' : 'Suas respostas aparecerão aqui.'}</p></CardContent></Card>)
               : (<div className="mx-auto max-w-3xl">
                   <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{filteredCompanyResponses.length} respondida{filteredCompanyResponses.length === 1 ? '' : 's'}</span></div>
                   <div className="grid grid-cols-1 gap-2">{filteredCompanyResponses.map(procura => renderCompactProcuraCard(procura, 'responded'))}</div>
                 </div>)}
            </TabsContent>
          </Tabs>
          <SubscriptionBlockedDialog
            open={showSubscriptionBlock}
            onClose={() => setShowSubscriptionBlock(false)}
            onShowPlans={() => {
              setShowSubscriptionBlock(false);
              onShowPlans?.();
            }}
          />
    </div>
  );
};

export default CompanyDashboard;
