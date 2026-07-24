
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Clock, Image as ImageIcon, MessageSquare, Wrench, BadgeCheck, SlidersHorizontal, Edit3, Eye, Phone, Navigation, MapPinned, Smartphone, ExternalLink, Star, Zap, Loader2, UserSquare2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CompanyProfileModal from '@/components/CompanyProfileModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';
import { distanceInKm, geocodeText } from '@/lib/geocoding';
import { isAndroidDevice, isIosDevice } from '@/lib/pwa';

const hasCoordinates = (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude);

const getMapLinks = ({ address, latitude, longitude }) => {
  const coordinates = hasCoordinates(latitude, longitude) ? `${latitude},${longitude}` : '';
  const destination = address || coordinates;
  const encodedDestination = encodeURIComponent(destination);

  return {
    apple: `https://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving&dir_action=navigate`,
    waze: coordinates
      ? `https://www.waze.com/ul?ll=${encodeURIComponent(coordinates)}&navigate=yes&utm_source=procuroprati`
      : `https://www.waze.com/ul?q=${encodedDestination}&navigate=yes&utm_source=procuroprati`,
  };
};

const StarRating = ({ value, onChange, size = 'h-5 w-5' }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(star)}
        className={onChange ? 'cursor-pointer' : 'cursor-default'}
        aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
      >
        <Star className={`${size} text-warning ${star <= value ? 'fill-current' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

const ResponseModal = ({ procura, isOpen, onClose, onMarkAsRead, onOpenChat, onEditProcura, companies = [], currentUser, myRatings = {}, onSubmitRating }) => {
  const [filterLocation, setFilterLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [distanceLimit, setDistanceLimit] = useState('all');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [ratingForm, setRatingForm] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [viewingCompanyProfile, setViewingCompanyProfile] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const directCoordinates = [currentUser?.latitude, currentUser?.longitude].every(Number.isFinite)
      ? { latitude: currentUser.latitude, longitude: currentUser.longitude }
      : null;
    if (directCoordinates) {
      setUserCoordinates(directCoordinates);
      return undefined;
    }
    let active = true;
    const searchCoordinates = [procura?.searchLatitude, procura?.searchLongitude].every(Number.isFinite)
      ? { latitude: procura.searchLatitude, longitude: procura.searchLongitude }
      : null;
    geocodeText(currentUser?.location || '')
      .then(coordinates => { if (active) setUserCoordinates(coordinates || searchCoordinates); })
      .catch(() => { if (active) setUserCoordinates(searchCoordinates); });
    return () => { active = false; };
  }, [isOpen, currentUser?.latitude, currentUser?.longitude, currentUser?.location, procura?.searchLatitude, procura?.searchLongitude]);

  const positiveResponses = useMemo(() => {
    if (!procura || !procura.responses) return [];
    return procura.responses
      .filter(r => r.status === 'available')
      .map(response => {
        const company = companies.find(item => item.id === response.companyId) || {};
        const distance = distanceInKm(userCoordinates, { latitude: company.latitude, longitude: company.longitude });
        return { ...response, company, distance };
      })
      .filter(r => {
        const locationMatches = !filterLocation || `${r.location || ''} ${r.company?.address || ''}`.toLowerCase().includes(filterLocation.toLowerCase());
        const distanceMatches = distanceLimit === 'all' || (r.distance !== null && r.distance <= Number(distanceLimit));
        return locationMatches && distanceMatches;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'recommended': {
            const planRank = planCode => planCode === 'nacional' ? 0 : planCode === 'estadual' ? 1 : 2;
            const planDifference = planRank(a.company?.planCode) - planRank(b.company?.planCode);
            if (planDifference !== 0) return planDifference;
            const distanceDifference = (a.distance ?? Infinity) - (b.distance ?? Infinity);
            if (distanceDifference !== 0) return distanceDifference;
            return new Date(a.responseDate) - new Date(b.responseDate);
          }
          case 'price_asc': return (parseFloat(a.price) || Infinity) - (parseFloat(b.price) || Infinity);
          case 'price_desc': return (parseFloat(b.price) || -Infinity) - (parseFloat(a.price) || -Infinity);
          case 'date_desc': return new Date(b.responseDate) - new Date(a.responseDate);
          case 'distance_asc': return (a.distance ?? Infinity) - (b.distance ?? Infinity);
          default: return 0;
        }
      });
  }, [procura, companies, userCoordinates, filterLocation, distanceLimit, sortOrder]);

  useEffect(() => {
    if(isOpen && procura && procura.responses){
      procura.responses.forEach(response => {
        if(response.status === 'available' && !response.isReadByUser && onMarkAsRead){
          onMarkAsRead(procura.id, response.id);
        }
      });
    }
  }, [isOpen, procura, onMarkAsRead]);

  useEffect(() => {
    if (isOpen) {
      setShowFilters(false);
      setSelectedResponse(null);
      setShowMapOptions(false);
      setDistanceLimit('all');
      setRatingForm(null);
    }
  }, [isOpen, procura?.id]);

  const handleRatingSubmit = async () => {
    if (!ratingForm?.rating || !selectedResponse || !onSubmitRating) return;
    setSubmittingRating(true);
    try {
      await onSubmitRating({ responseId: selectedResponse.id, rating: ratingForm.rating, comment: ratingForm.comment });
      setRatingForm(null);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!procura) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getPartTypeText = (type) => {
    if (type === 'original') return 'Original';
    if (type === 'parallel') return 'Paralela';
    return type || 'Não informado';
  };

  const openSystemMaps = (mapTarget) => {
    const { address, latitude, longitude } = mapTarget;
    const links = getMapLinks(mapTarget);

    setShowMapOptions(false);
    if (isAndroidDevice()) {
      const destination = address || (hasCoordinates(latitude, longitude) ? `${latitude},${longitude}` : '');
      window.location.assign(`geo:0,0?q=${encodeURIComponent(destination)}`);
      return;
    }
    window.location.assign(isIosDevice() ? links.apple : links.google);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()} className="max-h-[calc(100dvh-1rem)] max-w-2xl flex flex-col bg-card border-border text-foreground lg:max-w-4xl">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg sm:text-2xl text-foreground mb-1">
            Comparar respostas
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            {procura.partName} · {procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'}) · {positiveResponses.length} resposta(s)
            {procura.wantsPhotos && (<span className="ml-2 inline-flex items-center gap-1 text-warning"><ImageIcon className="h-4 w-4" /> Fotos solicitadas</span>)}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-2 sm:px-6">
          <div className={`grid gap-2 ${onEditProcura ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onEditProcura && <Button type="button" variant="outline" size="sm" onClick={() => onEditProcura(procura)} className="min-h-10 w-full border-border px-2 text-xs text-foreground sm:text-sm"><Edit3 className="mr-1.5 h-4 w-4" />Editar procura</Button>}
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(value => !value)} className="min-h-10 w-full border-border px-2 text-xs text-foreground sm:text-sm">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              {showFilters ? 'Ocultar filtros' : 'Filtros'}
              {(filterLocation || distanceLimit !== 'all' || sortOrder !== 'recommended') && <span className="ml-1 text-primary">•</span>}
            </Button>
          </div>
          {showFilters && (
            <div className="mt-3 rounded-xl border border-border bg-popover p-3 sm:p-4">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4">
                <div>
                  <Label htmlFor="filterResponseLocation" className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Filtrar por localização da empresa</Label>
                  <Input
                    id="filterResponseLocation"
                    placeholder="Digite cidade ou estado..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="filterResponseDistance" className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Proximidade do seu endereço</Label>
                  <Select value={distanceLimit} onValueChange={setDistanceLimit}>
                    <SelectTrigger id="filterResponseDistance" className="w-full bg-input text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      <SelectItem value="all">Qualquer distância</SelectItem>
                      <SelectItem value="5">Até 5 km</SelectItem>
                      <SelectItem value="10">Até 10 km</SelectItem>
                      <SelectItem value="25">Até 25 km</SelectItem>
                      <SelectItem value="50">Até 50 km</SelectItem>
                      <SelectItem value="100">Até 100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sortResponseOrder" className="mb-1 block text-xs font-medium text-muted-foreground sm:text-sm">Ordenar respostas por</Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sortResponseOrder" className="bg-input border-border w-full text-sm">
                      <SelectValue placeholder="Ordenar por..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="recommended">Recomendadas</SelectItem>
                      <SelectItem value="price_asc">Menor preço</SelectItem>
                      <SelectItem value="price_desc">Maior preço</SelectItem>
                      <SelectItem value="date_desc">Mais recentes</SelectItem>
                      <SelectItem value="distance_asc">Mais próximas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto px-2 pt-3 sm:px-6 sm:pt-4 space-y-3 sm:space-y-4 pb-4">
          {positiveResponses.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <Building2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Nenhuma resposta positiva encontrada</h3>
              <p className="text-muted-foreground text-sm">Tente ajustar os filtros ou aguarde mais respostas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {positiveResponses.map((response, index) => (
                <motion.div
                  key={response.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <Card className={`response-card overflow-hidden text-xs shadow-lg sm:text-sm h-full flex flex-col ${['regional', 'multiregional', 'estadual', 'nacional'].includes(response.company?.planCode) ? 'border-primary/60 ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="p-3 sm:p-4 flex gap-3 flex-1">
                      {response.photoUrl ? (
                        <button type="button" onClick={() => setSelectedPhotoUrl(response.photoUrl)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Ampliar foto da peça">
                          <img src={response.photoUrl} alt={`Foto da peça ${procura.partName} de ${response.companyName}`} className="h-full w-full object-contain" />
                          <span className="absolute inset-x-0 bottom-0 bg-background/80 px-1 py-0.5 text-[9px] font-medium text-foreground">Ampliar</span>
                        </button>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-border bg-popover flex items-center justify-center shrink-0 text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <button type="button" onClick={() => setViewingCompanyProfile(response.company)} className="flex min-w-0 items-center gap-1 truncate text-sm font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{response.companyName}</span></button>
                          {response.price && (<span className="font-extrabold text-accent-agile text-sm shrink-0">{formatCurrency(response.price)}</span>)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-muted-foreground">
                          {response.company?.validationStatus === 'validated' && <span className="flex items-center gap-0.5 text-accent-agile"><BadgeCheck className="h-3 w-3" />Empresa verificada</span>}
                          {response.company?.ratingCount > 0 && <span className="flex items-center gap-0.5 text-warning"><Star className="h-3 w-3 fill-current" />{response.company.avgRating} <span className="text-muted-foreground">({response.company.ratingCount})</span></span>}
                          {response.company?.badgeFastResponder && <span className="flex items-center gap-0.5 text-accent-agile"><Zap className="h-3 w-3" />Responde rápido</span>}
                          {response.company?.badgeWellRated && <span className="flex items-center gap-0.5 text-accent-agile"><Star className="h-3 w-3 fill-current" />Bem avaliada</span>}
                          {response.company?.planCode === 'nacional' && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">Alcance nacional</span>}
                          {response.partType && (<span className="flex items-center gap-0.5"><Wrench className="h-3 w-3" />{getPartTypeText(response.partType)}</span>)}
                          {response.partCondition && <span>· {({ new: 'Nova', excellent: 'Excelente', good: 'Boa', fair: 'Regular', poor: 'Com avarias' }[response.partCondition] || response.partCondition)}</span>}
                          {response.location && (<span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{response.location}</span>)}
                          {response.distance !== null && <span className="flex items-center gap-0.5 font-medium text-primary"><Navigation className="h-3 w-3" />{response.distance < 1 ? `${Math.round(response.distance * 1000)} m` : `${response.distance.toFixed(1)} km`}</span>}
                        </div>
                        {response.message && (<p className="text-foreground/90 mt-2 bg-popover p-2 rounded-md text-xs line-clamp-3">{response.message}</p>)}
                        <p className="text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(response.responseDate)}</p>
                        <Button onClick={() => setSelectedResponse(response)} size="sm" className="mt-2 flex w-full items-center gap-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />Ver resposta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-border pt-3 sm:pt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">Fechar</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={Boolean(selectedPhotoUrl)} onOpenChange={(open) => { if (!open) setSelectedPhotoUrl(''); }}>
        <DialogContent className="max-w-5xl overflow-y-auto border-border bg-card p-3 text-foreground sm:p-5">
          <DialogHeader>
            <DialogTitle>Foto da peça</DialogTitle>
            <DialogDescription>Imagem otimizada para análise. Use o zoom do navegador se precisar observar mais detalhes.</DialogDescription>
          </DialogHeader>
          {selectedPhotoUrl && <img src={selectedPhotoUrl} alt={`Foto ampliada da peça ${procura.partName}`} className="max-h-[75dvh] w-full rounded-lg bg-muted object-contain" />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedResponse)} onOpenChange={(open) => { if (!open) setSelectedResponse(null); }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto border-border bg-card p-0 text-foreground">
          {selectedResponse && <>
            <DialogHeader className="border-b border-border px-4 pb-4 pt-5 text-left sm:px-6">
              <div className="flex items-start gap-3 pr-8"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">{selectedResponse.company?.logoUrl ? <img src={selectedResponse.company.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}</span><div className="min-w-0"><DialogTitle className="text-left text-lg leading-tight">{selectedResponse.companyName}</DialogTitle><DialogDescription className="mt-1 text-left">Resposta para {procura.partName}</DialogDescription><button type="button" onClick={() => setViewingCompanyProfile(selectedResponse.company)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"><UserSquare2 className="h-3.5 w-3.5" />Ver perfil da empresa</button></div></div>
            </DialogHeader>
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-agile/30 bg-accent-agile/10 p-3"><div><p className="text-xs text-muted-foreground">Preço informado</p><p className="text-xl font-extrabold text-foreground">{selectedResponse.price ? formatCurrency(selectedResponse.price) : 'A combinar'}</p></div>{selectedResponse.company?.validationStatus === 'validated' && <span className="flex items-center gap-1 text-xs font-semibold text-accent-agile"><BadgeCheck className="h-4 w-4" />Verificada</span>}</div>
              {(selectedResponse.company?.ratingCount > 0 || selectedResponse.company?.badgeFastResponder || selectedResponse.company?.badgeWellRated) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedResponse.company?.ratingCount > 0 && <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 font-semibold text-warning"><Star className="h-3.5 w-3.5 fill-current" />{selectedResponse.company.avgRating} ({selectedResponse.company.ratingCount})</span>}
                  {selectedResponse.company?.badgeFastResponder && <span className="flex items-center gap-1 rounded-full bg-accent-agile/10 px-2 py-1 font-semibold text-accent-agile"><Zap className="h-3.5 w-3.5" />Responde rápido</span>}
                  {selectedResponse.company?.badgeWellRated && <span className="flex items-center gap-1 rounded-full bg-accent-agile/10 px-2 py-1 font-semibold text-accent-agile"><Star className="h-3.5 w-3.5 fill-current" />Bem avaliada</span>}
                </div>
              )}
              <div className="grid gap-3 rounded-xl border border-border bg-popover p-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    {(selectedResponse.company?.address || selectedResponse.address) ? (
                      <button
                        type="button"
                        onClick={() => setShowMapOptions(true)}
                        className="group mt-0.5 flex w-full items-start gap-1.5 rounded-md text-left font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Abrir endereço nos aplicativos de mapas"
                      >
                        <span>{selectedResponse.company?.address || selectedResponse.address}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    ) : <p className="font-medium text-foreground">Endereço não informado</p>}
                    {selectedResponse.distance !== null && <p className="mt-1 text-xs text-primary">A aproximadamente {selectedResponse.distance < 1 ? `${Math.round(selectedResponse.distance * 1000)} m` : `${selectedResponse.distance.toFixed(1)} km`} de você</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">Telefone</p>{selectedResponse.company?.phone ? <a href={`tel:${selectedResponse.company.phone}`} className="font-semibold text-primary underline-offset-2 hover:underline">{selectedResponse.company.phone}</a> : <p className="font-medium text-foreground">Não informado</p>}</div></div>
                {selectedResponse.company?.whatsapp && <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-agile" /><div><p className="text-xs text-muted-foreground">WhatsApp</p><a href={`https://wa.me/55${selectedResponse.company.whatsapp.replace(/\D/g, '').replace(/^55/, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-agile underline-offset-2 hover:underline">{selectedResponse.company.whatsapp}</a></div></div>}
              </div>
              <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{selectedResponse.partType && <span className="rounded-full bg-secondary px-2 py-1">{getPartTypeText(selectedResponse.partType)}</span>}{selectedResponse.partCondition && <span className="rounded-full bg-secondary px-2 py-1">{({ new: 'Nova', excellent: 'Excelente', good: 'Boa', fair: 'Regular', poor: 'Com avarias' }[selectedResponse.partCondition] || selectedResponse.partCondition)}</span>}</div>{selectedResponse.message && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selectedResponse.message}</p>}{selectedResponse.photoUrl && <button type="button" onClick={() => setSelectedPhotoUrl(selectedResponse.photoUrl)} className="mt-3 w-full overflow-hidden rounded-xl border border-border bg-muted"><img src={selectedResponse.photoUrl} alt={`Foto da peça ${procura.partName}`} className="max-h-56 w-full object-contain" /><span className="block py-2 text-xs font-semibold text-primary">Ampliar foto</span></button>}</div>
              {onSubmitRating && (
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">Avalie esta empresa</p>
                  {myRatings[selectedResponse.id] && !ratingForm ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <StarRating value={myRatings[selectedResponse.id].rating} />
                        {myRatings[selectedResponse.id].comment && <p className="mt-1 text-xs italic text-muted-foreground">“{myRatings[selectedResponse.id].comment}”</p>}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setRatingForm({ rating: myRatings[selectedResponse.id].rating, comment: myRatings[selectedResponse.id].comment || '' })}><Edit3 className="mr-1 h-3.5 w-3.5" />Editar</Button>
                    </div>
                  ) : ratingForm ? (
                    <div className="space-y-3">
                      <StarRating value={ratingForm.rating} onChange={(rating) => setRatingForm(current => ({ ...current, rating }))} />
                      <Textarea value={ratingForm.comment} onChange={(event) => setRatingForm(current => ({ ...current, comment: event.target.value }))} placeholder="Comentário (opcional)" className="text-sm" rows={2} />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" disabled={!ratingForm.rating || submittingRating} onClick={handleRatingSubmit}>{submittingRating && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Enviar avaliação</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setRatingForm(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setRatingForm({ rating: 0, comment: '' })}><Star className="mr-1 h-3.5 w-3.5" />Avaliar empresa</Button>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="grid grid-cols-1 gap-2 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-6">
              <Button type="button" variant="outline" onClick={() => setSelectedResponse(null)} className="w-full">Voltar</Button>
              <Button type="button" onClick={() => { setSelectedResponse(null); onClose(); onOpenChat(selectedResponse.companyId, procura.id); }} className="w-full"><MessageSquare className="mr-2 h-4 w-4" />Conversar</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={showMapOptions} onOpenChange={setShowMapOptions}>
        <DialogContent className="max-w-sm border-border bg-card p-0 text-foreground">
          {selectedResponse && (() => {
            const mapTarget = {
              address: [selectedResponse.company?.address || selectedResponse.address, selectedResponse.company?.postalCode].filter(Boolean).join(', '),
              latitude: selectedResponse.company?.latitude,
              longitude: selectedResponse.company?.longitude,
            };
            const links = getMapLinks(mapTarget);
            return <>
              <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><MapPinned className="h-6 w-6 text-primary" /></span>
                  <div className="min-w-0">
                    <DialogTitle className="text-left">Como deseja chegar?</DialogTitle>
                    <DialogDescription className="mt-1 line-clamp-2 text-left">{mapTarget.address}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid gap-2 px-5 pb-5">
                <Button type="button" onClick={() => openSystemMaps(mapTarget)} className="min-h-12 w-full justify-start text-left">
                  <Smartphone className="mr-3 h-5 w-5 shrink-0" />
                  <span>{isAndroidDevice() ? 'Escolher app de mapas' : isIosDevice() ? 'Abrir no Apple Maps' : 'Abrir no app de mapas'}</span>
                </Button>
                <Button asChild type="button" variant="outline" className="min-h-12 w-full justify-start">
                  <a href={links.google} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapOptions(false)}><Navigation className="mr-3 h-5 w-5 text-primary" />Google Maps</a>
                </Button>
                <Button asChild type="button" variant="outline" className="min-h-12 w-full justify-start">
                  <a href={links.waze} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapOptions(false)}><Navigation className="mr-3 h-5 w-5 text-accent-agile" />Waze</a>
                </Button>
                {!isIosDevice() && (
                  <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground">Se o aplicativo escolhido não estiver instalado, a rota abrirá no navegador.</p>
                )}
              </div>
            </>;
          })()}
        </DialogContent>
      </Dialog>

      <CompanyProfileModal company={viewingCompanyProfile} onClose={() => setViewingCompanyProfile(null)} />
    </Dialog>
  );
};

export default ResponseModal;
