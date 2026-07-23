
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Car, Clock, MapPin, Send, Camera, Upload, ListFilter, History, Edit3, EyeOff, Eye, CheckCircle2, XCircle, ArrowLeft, Bike, Truck, Bus, Timer, SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
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
import { SubscriptionBlockedDialog, TrialProgressCard } from '@/components/CompanyTrialExperience';

const CompanyDashboard = ({ allProcuras = [], companyResponses = [], onResponseSubmit, onPhotoUpload, currentUser, vehicleData, users = [], openProcuraId = null, onPushDestinationHandled, isDataLoaded = false, subscriptionContext = null, onShowPlans }) => {
  const [selectedProcura, setSelectedProcura] = useState(null);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
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

  const handleResponseFormSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!responseForm.status) errors.status = 'Informe se a peça está disponível.';
    if (responseForm.status === 'available' && !responseForm.partCondition) errors.partCondition = 'Selecione a condição da peça.';
    if (responseForm.status === 'available' && !responseForm.partType) errors.partType = 'Selecione se a peça é original ou paralela.';
    const normalizedPrice = Number(normalizeCurrencyValue(responseForm.price));
    if (responseForm.status === 'available' && (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0)) errors.price = 'Informe um preço válido, incluindo os centavos.';
    setResponseErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      window.requestAnimationFrame(() => {
        const field = document.getElementById(`response-${firstError}`) || document.getElementById(firstError);
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => field?.focus?.(), 250);
      });
      toast({ title: 'Revise a resposta', description: errors[firstError], variant: 'destructive' });
      return;
    }

    if (selectedProcura.wantsPhotos && responseForm.status === 'available' && !responseForm.photoUrl) {
      setShowPhotoConfirmDialog(true);
      return;
    }

    void submitResponse();
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
    };

    try {
      const saved = await onResponseSubmit(selectedProcura.id, response);
      if (!saved) return;

      const wasEditing = isEditingResponse;
      setResponseForm({ status: '', partCondition: '', partType: '', price: '', message: '', photoUrl: '' });
      setResponseErrors({});
      setPhotoPreview(null);
      setSelectedProcura(null);
      setIsEditingResponse(false);
      setShowPhotoConfirmDialog(false);
      setCurrentView(wasEditing ? 'responded' : 'to-respond');

      toast({ title: `Resposta ${wasEditing ? 'atualizada' : 'enviada'} com sucesso! 🎉`, description: "Continue respondendo às procuras abertas." });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

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

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'unavailable': return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default: return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'unavailable': return 'Indisponível';
      default: return 'Desconhecido';
    }
  };

  const getConditionText = (condition) => {
    switch (condition) {
      case 'new': return 'Nova';
      case 'excellent': return 'Excelente';
      case 'good': return 'Boa';
      case 'fair': return 'Regular';
      case 'poor': return 'Ruim';
      default: return condition;
    }
  };

  const getVehicleIcon = (type) => {
    if (type === 'motorcycle') return <Bike className="h-3 w-3" />;
    if (type === 'truck') return <Truck className="h-3 w-3" />;
    if (type === 'bus') return <Bus className="h-3 w-3" />;
    return <Car className="h-3 w-3" />;
  };

  const getCompactTimeRemaining = (procura) => {
    const remaining = getSearchRemainingMs(procura);
    if (remaining <= 0) return 'encerrando';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const renderProcuraCard = (procura, type) => {
    const hasResponded = type === 'responded';
    const response = hasResponded ? procura.myResponse : null;
    const currentUsers = users || [];
    const user = currentUsers.find(u => u.id === procura.userId);
    const timeRemaining = getTimeRemaining(procura);
    const distance = distanceInKm(
      { latitude: currentUser.latitude, longitude: currentUser.longitude },
      { latitude: procura.searchLatitude, longitude: procura.searchLongitude },
    );
    const preferredCondition = ({ new: 'Nova', used: 'Usada', any: 'Qualquer condição' }[procura.preferredCondition] || 'Qualquer condição');

    return (
      <motion.div 
        key={procura.id} 
        id={`procura-${procura.id}`}
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
        layout
      >
        <Card className="response-card hover:shadow-lg transition-all duration-300 flex flex-col h-full text-xs sm:text-sm">
          <CardHeader className="p-3 pb-2">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-sm sm:text-base text-foreground font-heading">{procura.partName}</CardTitle>
              <div className="flex items-center gap-1 flex-wrap">
                {!timeRemaining.expired && !hasResponded && (
                  <Badge variant="outline" className="rounded-full border-warning text-warning flex items-center gap-1 text-xs font-bold">
                    <Timer className="h-3 w-3" /> {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}{timeRemaining.hours}h {timeRemaining.minutes}m
                  </Badge>
                )}
                {procura.wantsPhotos && (<Badge variant="outline" className="border-warning text-warning flex items-center gap-1 text-xs shrink-0"><Camera className="h-3 w-3" /> Fotos</Badge>)}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">{getVehicleIcon(procura.vehicleType)}{procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground/80"><Clock className="h-3 w-3" />{formatDate(procura.createdAt)}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/80">
              {user && <span>👤 {user.name}</span>}
              {distance !== null && <span>📍 {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} de você</span>}
            </div>
          </CardHeader>
          <CardContent className="flex-grow p-3 text-xs">
            <div className="flex gap-3 mb-2">
              {procura.referencePhotoUrl && <img src={procura.referencePhotoUrl} alt={`Referência para ${procura.partName}`} className="h-20 w-20 shrink-0 rounded-[10px] border border-border object-cover" />}
              <div className="min-w-0 flex-1">
                {procura.partDescription && <div className="bg-popover rounded-lg px-2.5 py-2 mb-2 text-foreground/90">{procura.partDescription}</div>}
                <Badge variant="secondary" className="text-[11px]">Preferência: {preferredCondition}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-primary bg-primary/8 rounded-md px-2 py-1 w-fit mb-1">
              <MapPin className="h-3 w-3" />{(procura.locations || []).map(l => l.label).join(', ') || 'Não especificado'}
            </div>
            {hasResponded && response && (
              <div className="mt-2 p-2.5 bg-popover rounded-lg text-xs">
                <p className="font-semibold text-foreground mb-1">Sua resposta</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`font-semibold flex items-center gap-1 ${response.status === 'available' ? 'text-accent-agile' : response.status === 'unavailable' ? 'text-danger' : 'text-warning'}`}>{getStatusIcon(response.status)}{getStatusText(response.status)}</span></div>
                {response.partType && <div className="flex justify-between mt-0.5"><span className="text-muted-foreground">Tipo</span><span className="text-foreground">{response.partType === 'original' ? 'Original' : 'Paralela'}</span></div>}
                {response.partCondition && <div className="flex justify-between mt-0.5"><span className="text-muted-foreground">Condição</span><span className="text-foreground">{getConditionText(response.partCondition)}</span></div>}
                {response.price && <div className="flex justify-between mt-0.5"><span className="text-muted-foreground">Preço</span><span className="text-foreground font-bold">{formatCurrency(response.price)}</span></div>}
                <p className={`flex items-center gap-1 mt-1.5 ${response.isReadByUser ? 'text-accent-agile' : 'text-warning'}`}>
                  {response.isReadByUser ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {response.isReadByUser ? "Visualizada pelo usuário" : "Não visualizada pelo cliente"}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-3 pt-2 border-t border-border/50 flex flex-col gap-2">
            {!hasResponded ? (
              <div className="grid w-full grid-cols-2 gap-3">
                <Button onClick={() => handleQuickResponse(procura, true)} disabled={isSubmittingResponse} className="min-h-12 w-full bg-accent-agile px-3 text-sm font-bold text-accent-agile-foreground hover:bg-accent-agile/90">
                  <CheckCircle2 className="mr-2 h-5 w-5 shrink-0" />Tenho
                </Button>
                <Button onClick={() => handleQuickResponse(procura, false)} disabled={isSubmittingResponse} variant="outline" className="min-h-12 w-full border-2 border-danger/70 px-3 text-sm font-bold text-danger hover:bg-destructive hover:text-destructive-foreground">
                  {isSubmittingResponse ? <><span className="mr-2 inline-flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" /></span>Enviando</> : <><XCircle className="mr-2 h-5 w-5 shrink-0" />Não tenho</>}
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleSelectProcura(procura, hasResponded)} className="min-h-11 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90">
                <Edit3 className="h-3 w-3 mr-1" />Editar Resposta
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  const renderCompactProcuraCard = (procura, type = 'to-respond') => {
    const hasResponded = type === 'responded';
    const response = procura.myResponse;
    const distance = distanceInKm({ latitude: currentUser.latitude, longitude: currentUser.longitude }, { latitude: procura.searchLatitude, longitude: procura.searchLongitude });
    const isAvailable = response?.status === 'available';
    return <Card key={procura.id} id={`procura-${procura.id}`} className={`overflow-hidden border-border border-l-[3px] bg-card shadow-sm ${hasResponded ? isAvailable ? 'border-l-accent-agile' : 'border-l-muted-foreground' : 'border-l-primary'}`}><CardContent className="p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="line-clamp-2 min-h-10 text-lg font-extrabold leading-5 tracking-tight text-foreground">{procura.partName}</p><p className="mt-1 flex min-h-8 flex-wrap items-start gap-1 text-xs leading-4 text-muted-foreground">{getVehicleIcon(procura.vehicleType)} <span>{procura.vehicleBrand} {procura.vehicleModel} {procura.vehicleYear ? `(${procura.vehicleYear})` : ''}</span></p></div>{hasResponded ? <Badge className={`shrink-0 font-extrabold ${isAvailable ? 'border-transparent bg-accent-agile text-accent-agile-foreground' : 'bg-secondary text-muted-foreground'}`}>{isAvailable ? 'Tenho' : 'Não tenho'}</Badge> : <Badge variant="outline" className="shrink-0 border-warning text-warning"><Timer className="mr-1 h-3 w-3" />{getCompactTimeRemaining(procura)}</Badge>}</div><div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{distance !== null && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(0)} km`} de você</span>}{hasResponded && isAvailable && response?.price != null && <span className="font-bold text-foreground">{formatCurrency(response.price)}</span>}{hasResponded && <span className={response?.isReadByUser ? 'text-accent-agile' : 'text-warning'}>{response?.isReadByUser ? 'Visualizada' : 'Aguardando visualização'}</span>}</div><div className="mt-2 grid grid-cols-2 gap-2">{hasResponded ? <Button onClick={() => handleSelectProcura(procura, true)} className="col-span-2 min-h-11 bg-primary text-xs font-bold text-primary-foreground"><Edit3 className="mr-1.5 h-4 w-4" />Editar resposta</Button> : <><Button onClick={() => handleQuickResponse(procura, true)} disabled={isSubmittingResponse} className="min-h-11 bg-accent-agile px-2 text-xs font-bold text-accent-agile-foreground hover:bg-accent-agile/90"><CheckCircle2 className="mr-1.5 h-4 w-4 shrink-0" />Tenho</Button><Button onClick={() => handleQuickResponse(procura, false)} disabled={isSubmittingResponse} variant="outline" className="min-h-11 border-danger/60 px-2 text-xs font-bold text-danger hover:bg-destructive hover:text-destructive-foreground"><XCircle className="mr-1.5 h-4 w-4 shrink-0" />Não tenho</Button></>}</div></CardContent></Card>;
  };

  if (currentView === 'response_form' && selectedProcura) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Card className="glass-effect border-primary/30 max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3">
              <CardTitle className="text-foreground text-lg sm:text-xl">{isEditingResponse ? 'Editar Resposta para:' : 'Responder Procura:'} {selectedProcura.partName}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setSelectedProcura(null); setIsEditingResponse(false); setCurrentView(returnView); }} className="w-full sm:w-auto border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary"><ArrowLeft className="h-4 w-4 mr-1"/>Voltar</Button>
            </div>
            <div className="text-muted-foreground text-sm">{selectedProcura.vehicleType} - {selectedProcura.vehicleBrand} {selectedProcura.vehicleModel} ({selectedProcura.vehicleYear || 'N/A'})</div>
            {selectedProcura.wantsPhotos && <Badge variant="outline" className="border-warning text-warning flex items-center gap-1 w-fit"><Camera className="h-4 w-4" /> Usuário solicitou fotos</Badge>}
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-input/50 rounded-lg text-sm">
              <h3 className="font-semibold mb-1 text-foreground">Detalhes da Procura:</h3>
              {selectedProcura.partDescription && <p className="text-muted-foreground mb-1">{selectedProcura.partDescription}</p>}
              {selectedProcura.referencePhotoUrl && <a href={selectedProcura.referencePhotoUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-[10px] border border-border bg-muted p-1" aria-label="Abrir foto de referência em tamanho maior"><img src={selectedProcura.referencePhotoUrl} alt="Foto de referência enviada pelo comprador" className="max-h-72 w-full rounded-lg object-contain" /><span className="block py-1 text-center text-xs font-medium text-primary">Abrir imagem em tamanho maior</span></a>}
              {(selectedProcura.locations || []).length > 0 && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {(selectedProcura.locations || []).map(l => l.label).join(', ')}</p>}
            </div>
            <form onSubmit={handleResponseFormSubmit} onKeyDown={(event) => {
              if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault();
            }} className="space-y-3 sm:space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="partCondition" className="block text-sm font-medium mb-2 text-muted-foreground">Condição da Peça *</Label>
                  <Select value={responseForm.partCondition} onValueChange={(value) => { setResponseForm({...responseForm, partCondition: value}); setResponseErrors(current => ({ ...current, partCondition: '' })); }}>
                    <SelectTrigger id="response-partCondition" aria-invalid={Boolean(responseErrors.partCondition)} className={`bg-input ${responseErrors.partCondition ? 'border-danger ring-1 ring-danger' : 'border-border'}`}><SelectValue placeholder="Selecione a condição" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="new">🆕 Nova (sem uso)</SelectItem>
                      <SelectItem value="excellent">⭐ Excelente (quase nova)</SelectItem>
                      <SelectItem value="good">👍 Boa (pequenos desgastes)</SelectItem>
                      <SelectItem value="fair">⚠️ Regular (desgastes visíveis)</SelectItem>
                      <SelectItem value="poor">🔧 Ruim (precisa reparo)</SelectItem>
                    </SelectContent>
                  </Select>
                  {responseErrors.partCondition && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.partCondition}</p>}
                </div>
                <div>
                  <Label htmlFor="partType" className="block text-sm font-medium mb-2 text-muted-foreground">Tipo da Peça *</Label>
                  <Select value={responseForm.partType} onValueChange={(value) => { setResponseForm({...responseForm, partType: value}); setResponseErrors(current => ({ ...current, partType: '' })); }}>
                    <SelectTrigger id="response-partType" aria-invalid={Boolean(responseErrors.partType)} className={`bg-input ${responseErrors.partType ? 'border-danger ring-1 ring-danger' : 'border-border'}`}><SelectValue placeholder="Original ou Paralela" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="original">🔩 Original</SelectItem>
                      <SelectItem value="parallel">⚙️ Paralela</SelectItem>
                    </SelectContent>
                  </Select>
                  {responseErrors.partType && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.partType}</p>}
                </div>
              </div>

              {selectedProcura.wantsPhotos && (
                <div>
                  <Label className="block text-sm font-medium mb-2 text-muted-foreground">Foto da Peça *</Label>
                  <Button type="button" variant="outline" onClick={handlePhotoUpload} disabled={isUploadingPhoto} className="w-full border-primary text-primary"><Upload className={`mr-2 h-4 w-4 ${isUploadingPhoto ? 'animate-pulse' : ''}`}/> {isUploadingPhoto ? 'Enviando foto...' : 'Adicionar foto'}</Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <p className="mt-1 text-xs text-muted-foreground">A imagem será otimizada automaticamente para manter os detalhes sem ocupar espaço desnecessário.</p>
                  {photoPreview && <div className="mt-2"><img src={photoPreview} alt="Pré-visualização da peça" className="max-h-32 rounded-md border border-border" /></div>}
                </div>
              )}
              <div>
                <Label htmlFor="response-price" className="block text-sm font-medium mb-2 text-muted-foreground">Preço (R$) *</Label>
                <Input id="response-price" type="text" inputMode="decimal" placeholder="Ex: 250,00" value={responseForm.price} onChange={(e) => { setResponseForm({...responseForm, price: sanitizeCurrencyInput(e.target.value)}); setResponseErrors(current => ({ ...current, price: '' })); }} onBlur={(e) => setResponseForm(current => ({ ...current, price: formatCurrencyInput(e.target.value) }))} aria-invalid={Boolean(responseErrors.price)} className={`bg-input ${responseErrors.price ? 'border-danger ring-1 ring-danger' : 'border-border'}`}/>
                {responseErrors.price && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{responseErrors.price}</p>}
              </div>
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
              <Button type="submit" disabled={isSubmittingResponse || isUploadingPhoto} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3" aria-live="polite">
                {isSubmittingResponse ? <><span className="mr-2 inline-flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" /></span>Enviando resposta</> : <><Send className="h-5 w-5 mr-2" /> {isEditingResponse ? 'Atualizar Resposta' : 'Enviar Resposta'}</>}
              </Button>
            </form>
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
                O usuário solicitou fotos da peça, mas você não adicionou nenhuma imagem. Deseja realmente responder sem foto?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPhotoConfirmDialog(false)} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
                Cancelar e Adicionar Foto
              </Button>
              <Button onClick={() => void submitResponse()} disabled={isSubmittingResponse} className="gradient-bg hover:opacity-90 text-primary-foreground" aria-live="polite">
                {isSubmittingResponse ? 'Enviando resposta...' : 'Sim, Enviar sem Foto'}
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
          <TrialProgressCard context={subscriptionContext} onShowPlans={onShowPlans} />
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{currentView === 'responded' ? 'Procuras respondidas' : 'Procuras para responder'}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{currentView === 'responded' ? 'Revise ou edite as respostas que você enviou.' : 'Responda primeiro às oportunidades que sua empresa pode atender.'}</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(value => !value)} className={`relative min-h-10 shrink-0 px-3 ${showFilters || hasActiveFilters ? 'border-primary text-primary' : ''}`} aria-expanded={showFilters} aria-controls="company-search-filters"><SlidersHorizontal className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Filtros</span>{hasActiveFilters && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-agile ring-2 ring-background" />}</Button>
            </div>
            <DashboardSectionTabs value={currentView} onChange={setCurrentView} items={[{ value: 'to-respond', label: 'Ativas', count: filteredProcurasToRespond.length, icon: ListFilter }, { value: 'responded', label: 'Respondidas', count: filteredCompanyResponses.length, icon: History }]} />
            {showFilters && <Card id="company-search-filters" className="mb-4 mt-3 border-border bg-card shadow-sm"><CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"><div><Label htmlFor="filterPartName" className="mb-1.5 block text-xs text-muted-foreground">Nome da peça</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="filterPartName" placeholder="Ex: Farol, motor..." value={filterPartName} onChange={(e) => setFilterPartName(e.target.value)} className="min-h-11 bg-input pl-9 text-sm" /></div></div><div><Label htmlFor="filterVehicle" className="mb-1.5 block text-xs text-muted-foreground">Marca, modelo ou ano</Label><div className="relative"><Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="filterVehicle" placeholder="Ex: Fiat Palio 2010..." value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} className="min-h-11 bg-input pl-9 text-sm" /></div></div>{hasActiveFilters && <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="justify-self-start text-muted-foreground sm:col-span-2"><RotateCcw className="mr-2 h-4 w-4" />Limpar filtros</Button>}</CardContent></Card>}
            <TabsContent value="to-respond">
              {filteredProcurasToRespond.length === 0 ? (<Card className="border-border bg-card"><CardContent className="py-10 text-center"><BrandMark className="mx-auto mb-3 h-12 w-12 rounded-xl" /><p className="font-semibold text-foreground">{hasActiveFilters ? 'Nenhuma procura encontrada.' : 'Nenhuma procura aguardando resposta.'}</p><p className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? 'Limpe ou altere os filtros para ver outras procuras.' : 'Quando houver oportunidades na sua região, elas aparecerão aqui.'}</p></CardContent></Card>)
              : (<div className="mx-auto grid max-w-3xl grid-cols-1 gap-3">{filteredProcurasToRespond.map(procura => renderCompactProcuraCard(procura, 'to-respond'))}</div>)}
            </TabsContent>
            <TabsContent value="responded">
               {filteredCompanyResponses.length === 0 ? (<Card className="border-border bg-card"><CardContent className="py-10 text-center"><BrandMark className="mx-auto mb-3 h-12 w-12 rounded-xl" /><p className="font-semibold text-foreground">{hasActiveFilters ? 'Nenhuma resposta encontrada.' : 'Você ainda não respondeu nenhuma procura.'}</p><p className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? 'Limpe ou altere os filtros para ver outras respostas.' : 'Suas respostas aparecerão aqui.'}</p></CardContent></Card>)
               : (<div className="mx-auto grid max-w-3xl grid-cols-1 gap-3">{filteredCompanyResponses.map(procura => renderCompactProcuraCard(procura, 'responded'))}</div>)}
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
