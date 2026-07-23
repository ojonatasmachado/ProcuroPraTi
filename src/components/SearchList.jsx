
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Car, MapPin, Eye, Camera, CheckCircle, RotateCcw, CalendarDays, Filter, Bike, Truck, Bus, SlidersHorizontal, Search } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSearchDaysRemaining } from '@/lib/searchDuration';

const SearchList = ({ procuras, onViewResponses, onMarkAsFinished, onReopenWithChanges, listType, unreadNotifications }) => {
  const [filterLocation, setFilterLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc'); 
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  const positiveResponsesCount = (responses) => {
    return responses.filter(r => r.status === 'available').length;
  };

  const getDaysRemaining = (procura) => {
    return getSearchDaysRemaining(procura);
  };

  const filteredAndSortedProcuras = procuras
    .filter(procura => {
      if (!filterLocation) return true;
      const searchLocationLower = filterLocation.toLowerCase().trim();
      const procuraLocations = (procura.locations || []).map(l => l.label.toLowerCase());
      const hasMatchingLocation = procuraLocations.some(loc => loc.includes(searchLocationLower));
      const hasMatchingResponse = (procura.responses || []).some(res => res.location && res.location.toLowerCase().includes(searchLocationLower) && res.status === 'available');
      const searchableVehicle = `${procura.vehicleBrand || ''} ${procura.vehicleModel || ''} ${procura.vehicleYear || ''}`.toLowerCase();
      return hasMatchingLocation || hasMatchingResponse || (procura.partName || '').toLowerCase().includes(searchLocationLower) || searchableVehicle.includes(searchLocationLower);
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'date_asc': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'date_desc': return new Date(b.createdAt) - new Date(a.createdAt);
        default: return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  const getVehicleIcon = (type) => {
    if (type === 'motorcycle') return <Bike className="h-3 w-3" />;
    if (type === 'truck') return <Truck className="h-3 w-3" />;
    if (type === 'bus') return <Bus className="h-3 w-3" />;
    return <Car className="h-3 w-3" />;
  }

  const getConditionText = (condition) => ({ new: 'Nova', used: 'Usada', any: 'Qualquer condição' }[condition] || 'Qualquer condição');


  if (procuras.length === 0 && listType === 'active') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
        <BrandMark className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 rounded-2xl" />
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">
          Nenhuma procura ativa no momento.
        </h3>
        <p className="text-muted-foreground text-sm">
          Crie uma nova procura para começar!
        </p>
      </motion.div>
    );
  }
  
  if (procuras.length === 0 && listType === 'finished') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
        <BrandMark className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 rounded-2xl" />
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">
          Nenhuma procura finalizada.
        </h3>
        <p className="text-muted-foreground text-sm">
          Suas procuras finalizadas aparecerão aqui.
        </p>
      </motion.div>
    );
  }


  return (
    <>
      {procuras.length > 0 && (
        <div className="mx-auto mb-4 max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-base font-bold text-foreground">{listType === 'active' ? 'Procuras ativas' : 'Procuras finalizadas'}</h2><p className="mt-1 text-xs text-muted-foreground">{listType === 'active' ? 'Acompanhe respostas e mantenha suas procuras organizadas.' : 'Consulte ou reabra suas procuras anteriores.'}</p></div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(value => !value)} className={`relative min-h-10 shrink-0 px-3 ${showFilters || filterLocation || sortOrder !== 'date_desc' ? 'border-primary text-primary' : ''}`} aria-expanded={showFilters} aria-controls={`search-list-filters-${listType}`}><SlidersHorizontal className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Filtros</span>{(filterLocation || sortOrder !== 'date_desc') && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-agile ring-2 ring-background" />}</Button>
          </div>
          {showFilters && <Card id={`search-list-filters-${listType}`} className="mt-3 border-border bg-card shadow-sm"><CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`filterLocation-${listType}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">Buscar procura</Label>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input
                id={`filterLocation-${listType}`}
                placeholder="Peça, veículo ou cidade..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="min-h-11 bg-input pl-9 text-sm"
              /></div>
            </div>
            <div>
              <Label htmlFor={`sortOrder-${listType}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">Ordenar por</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger id={`sortOrder-${listType}`} className="min-h-11 w-full bg-input text-sm">
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="date_desc">Mais Recentes</SelectItem>
                  <SelectItem value="date_asc">Mais Antigas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filterLocation || sortOrder !== 'date_desc') && <Button type="button" variant="ghost" size="sm" onClick={() => { setFilterLocation(''); setSortOrder('date_desc'); }} className="justify-self-start text-muted-foreground sm:col-span-2"><RotateCcw className="mr-2 h-4 w-4" />Limpar filtros</Button>}
          </CardContent></Card>}
        </div>
      )}

      {filteredAndSortedProcuras.length === 0 && procuras.length > 0 && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 sm:py-12">
          <Filter className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Nenhuma procura encontrada com os filtros atuais.</h3>
          <p className="text-muted-foreground text-sm">Tente ajustar ou limpar os filtros.</p>
        </motion.div>
      )}

      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3">
        {filteredAndSortedProcuras.map((procura, index) => {
          const responsesCount = positiveResponsesCount(procura.responses || []);
          return (
          <motion.div
            key={procura.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            layout
          >
            <Card className="overflow-hidden border-border border-l-[3px] border-l-primary bg-card shadow-sm transition-colors hover:border-primary/50">
              <CardHeader className="p-4 pb-2">
                <div className="flex min-h-[72px] items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><CardTitle className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground">{procura.partName}</CardTitle><div className="mt-1 flex min-h-8 items-start gap-1 text-xs leading-4 text-muted-foreground">{getVehicleIcon(procura.vehicleType)}<span>{procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'})</span></div></div>
                  <Badge className={`shrink-0 rounded-full border-transparent text-[11px] font-bold ${responsesCount > 0 ? 'bg-accent-agile/15 text-accent-agile' : 'bg-secondary text-muted-foreground'}`}>
                    {responsesCount > 0 ? `${responsesCount} resposta${responsesCount === 1 ? '' : 's'}` : 'Sem respostas'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/80"><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(procura.createdAt)}</span>{listType === 'active' && <span className="flex items-center gap-1 text-warning"><CalendarDays className="h-3 w-3" />{getDaysRemaining(procura)} dia(s)</span>}{procura.wantsPhotos && <span className="flex items-center gap-1 text-warning"><Camera className="h-3 w-3" />Fotos</span>}</div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                <div className="flex flex-wrap gap-2 text-xs">{(procura.locations || []).length > 0 && <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary"><MapPin className="h-3 w-3" />{(procura.locations || []).map(l => l.label).join('; ')}</span>}<Badge variant="secondary" className="text-[11px]">{getConditionText(procura.preferredCondition)}</Badge></div>
              </CardContent>
              <CardFooter className="grid grid-cols-1 gap-2 border-t border-border/50 p-3 sm:grid-cols-[1fr_auto]">
                  <Button onClick={() => onViewResponses(procura)} size="sm" className="min-h-11 w-full text-xs sm:min-h-10 sm:flex-1"><Eye className="h-3 w-3 mr-1" />{responsesCount > 0 ? `Ver respostas (${responsesCount})` : 'Ver procura'}</Button>
                  {listType === 'active' && onMarkAsFinished && (
                    <Button onClick={() => onMarkAsFinished(procura.id)} variant="outline" size="sm" className="min-h-11 w-full text-xs sm:min-h-10 sm:w-auto"><CheckCircle className="h-3 w-3 mr-1" />Finalizar</Button>
                  )}
                  {listType === 'finished' && onReopenWithChanges && (
                     <Button onClick={() => onReopenWithChanges(procura)} variant="outline" size="sm" className="min-h-11 w-full border-primary/60 text-xs text-primary hover:bg-primary/10 sm:min-h-10 sm:w-auto"><RotateCcw className="mr-1 h-3 w-3" />Reabrir e ajustar</Button>
                  )}
              </CardFooter>
            </Card>
          </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default SearchList;
