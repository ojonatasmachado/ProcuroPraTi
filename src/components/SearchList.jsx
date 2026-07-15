
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Car, MapPin, Eye, Camera, CheckCircle, RotateCcw, PackageSearch, CalendarDays, Filter, AlertCircle, Bike, Truck, Bus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SearchList = ({ procuras, onViewResponses, onMarkAsFinished, onReopenSearch, listType, unreadNotifications }) => {
  const [filterLocation, setFilterLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc'); 

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  const positiveResponsesCount = (responses) => {
    return responses.filter(r => r.status === 'available').length;
  };

  const getDaysRemaining = (procura) => {
    if (procura.status !== 'active') return 0;
    const endDate = new Date(procura.createdAt);
    endDate.setDate(endDate.getDate() + procura.duration);
    const remaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    return remaining > 0 ? remaining : 0;
  };

  const filteredAndSortedProcuras = procuras
    .filter(procura => {
      if (!filterLocation) return true;
      const searchLocationLower = filterLocation.toLowerCase();
      const procuraLocations = (procura.locations || []).map(l => l.label.toLowerCase());
      const hasMatchingLocation = procuraLocations.some(loc => loc.includes(searchLocationLower));
      const hasMatchingResponse = procura.responses.some(res => res.location && res.location.toLowerCase().includes(searchLocationLower) && res.status === 'available');
      return hasMatchingLocation || hasMatchingResponse;
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


  if (procuras.length === 0 && listType === 'active') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 sm:py-12">
        <PackageSearch className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 sm:py-12">
        <PackageSearch className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
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
      {(listType === 'active' && procuras.length > 0) && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 glass-effect rounded-lg border border-border/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
            <div>
              <Label htmlFor="filterLocation" className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">Filtrar por Localização (Procura ou Resposta)</Label>
              <Input 
                id="filterLocation"
                placeholder="Digite cidade ou estado..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="bg-input border-border text-sm"
              />
            </div>
            <div>
              <Label htmlFor="sortOrder" className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">Ordenar por</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger id="sortOrder" className="bg-input border-border w-full text-sm">
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="date_desc">Mais Recentes</SelectItem>
                  <SelectItem value="date_asc">Mais Antigas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedProcuras.length === 0 && listType === 'active' && procuras.length > 0 && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 sm:py-12">
          <Filter className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Nenhuma procura encontrada com os filtros atuais.</h3>
          <p className="text-muted-foreground text-sm">Tente ajustar seus filtros ou crie uma nova procura.</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredAndSortedProcuras.map((procura, index) => {
          const unreadCountForProcura = unreadNotifications.filter(n => n.procuraId === procura.id).length;
          return (
          <motion.div
            key={procura.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            layout
          >
            <Card className="search-card hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden text-xs sm:text-sm">
              <CardHeader className="p-3 pb-2">
                <div className="flex justify-between items-center gap-2 mb-1.5">
                  <Badge className={`rounded-full text-[11px] font-bold border-transparent ${procura.status === 'active' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    ● {procura.status === 'active' ? 'Ativa' : 'Encerrada'}
                  </Badge>
                  <div className="flex items-center gap-1 flex-wrap">
                    {unreadCountForProcura > 0 && listType === 'active' && (
                      <Badge variant="destructive" className="flex items-center gap-1 text-xs relative pulse-glow bg-green-500 border-green-700 text-white">
                        <AlertCircle className="h-3 w-3" /> {unreadCountForProcura}
                      </Badge>
                    )}
                    {procura.wantsPhotos && (<Badge variant="outline" className="border-yellow-500 text-yellow-500 flex items-center gap-1 text-xs shrink-0"><Camera className="h-3 w-3" /> Fotos</Badge>)}
                  </div>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm sm:text-base text-foreground font-heading">{procura.partName}</CardTitle>
                  <Badge className="rounded-full text-[11px] font-bold border-transparent bg-accent-agile/15 text-accent-agile shrink-0">
                    ● {positiveResponsesCount(procura.responses)} resposta(s)
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">{getVehicleIcon(procura.vehicleType)}{procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'})</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground/80"><Clock className="h-3 w-3" />{formatDate(procura.createdAt)}</div>
                {listType === 'active' && (
                  <div className="flex items-center gap-1 text-xs text-orange-500"><CalendarDays className="h-3 w-3" /> {getDaysRemaining(procura)} dia(s) restante(s)</div>
                )}
              </CardHeader>
              <CardContent className="p-3 flex-grow">
                {procura.partDescription && (<p className="text-foreground mb-2 line-clamp-2 text-xs">{procura.partDescription}</p>)}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-xs">
                  {(procura.locations || []).length > 0 && (<span className="flex items-center gap-1 text-primary bg-primary/8 rounded-md px-2 py-1"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" />{(procura.locations || []).map(l => l.label).join('; ')}</span>)}
                </div>
              </CardContent>
              <CardFooter className="flex-col sm:flex-row justify-between items-center gap-2 p-3 border-t border-border/50">
                  <Button onClick={() => onViewResponses(procura)} variant="outline" size="sm" className="border-primary/70 text-primary hover:bg-primary/10 w-full sm:w-auto text-xs py-1.5 h-auto"><Eye className="h-3 w-3 mr-1" />Ver Respostas</Button>
                  {listType === 'active' && onMarkAsFinished && (
                    <Button onClick={() => onMarkAsFinished(procura.id)} variant="outline" size="sm" className="border-blue-500/70 text-blue-500 hover:bg-blue-500/10 w-full sm:w-auto text-xs py-1.5 h-auto"><CheckCircle className="h-3 w-3 mr-1" />Finalizar</Button>
                  )}
                  {listType === 'finished' && onReopenSearch && (
                     <Button onClick={() => onReopenSearch(procura.id)} variant="outline" size="sm" className="border-yellow-500/70 text-yellow-500 hover:bg-yellow-500/10 w-full sm:w-auto text-xs py-1.5 h-auto"><RotateCcw className="h-3 w-3 mr-1" />Reabrir</Button>
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
