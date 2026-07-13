
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Phone, Mail, MapPin, DollarSign, CheckCircle, XCircle, Clock, Image as ImageIcon, MessageSquare, Filter, SortAsc, SortDesc, Info, ExternalLink, EyeOff, Eye, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const ResponseModal = ({ procura, isOpen, onClose, onMarkAsRead, onOpenChat }) => {
  const [filterLocation, setFilterLocation] = useState('');
  const [sortOrder, setSortOrder] = useState('price_asc');

  const positiveResponses = useMemo(() => {
    if (!procura || !procura.responses) return [];
    return procura.responses
      .filter(r => r.status === 'available')
      .filter(r => {
        if (!filterLocation) return true;
        return (r.location || '').toLowerCase().includes(filterLocation.toLowerCase());
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'price_asc': return (parseFloat(a.price) || Infinity) - (parseFloat(b.price) || Infinity);
          case 'price_desc': return (parseFloat(b.price) || -Infinity) - (parseFloat(a.price) || -Infinity);
          case 'date_desc': return new Date(b.responseDate) - new Date(a.responseDate);
          default: return 0;
        }
      });
  }, [procura, filterLocation, sortOrder]);

  useEffect(() => {
    if(isOpen && procura && procura.responses){
      procura.responses.forEach(response => {
        if(response.status === 'available' && !response.isRead && onMarkAsRead){
          onMarkAsRead(procura.id, response.id);
        }
      });
    }
  }, [isOpen, procura, onMarkAsRead]);

  if (!procura) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500 border-green-700';
      case 'unavailable': return 'bg-red-500 border-red-700';
      default: return 'bg-muted border-border';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'unavailable': return 'Indisponível';
      default: return 'Desconhecido';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'unavailable': return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      default: return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const getPartTypeText = (type) => {
    if (type === 'original') return 'Original';
    if (type === 'parallel') return 'Paralela';
    return type || 'Não informado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-foreground">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg sm:text-2xl text-primary mb-1">
            Respostas Positivas para: {procura.partName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            {procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'})
            {procura.wantsPhotos && (<span className="ml-2 inline-flex items-center gap-1 text-yellow-500"><ImageIcon className="h-4 w-4" /> Fotos solicitadas</span>)}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 my-2 sm:my-4">
          <div className="p-3 sm:p-4 glass-effect rounded-lg border border-border/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
              <div>
                <Label htmlFor="filterResponseLocation" className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">Filtrar por Localização do CDV</Label>
                <Input 
                  id="filterResponseLocation"
                  placeholder="Digite cidade ou estado..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="bg-input border-border text-sm"
                />
              </div>
              <div>
                <Label htmlFor="sortResponseOrder" className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 block">Ordenar Respostas por</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger id="sortResponseOrder" className="bg-input border-border w-full text-sm">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="price_asc">Menor Preço</SelectItem>
                    <SelectItem value="price_desc">Maior Preço</SelectItem>
                    <SelectItem value="date_desc">Mais Recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-2 sm:px-6 space-y-3 sm:space-y-4 pb-4">
          {positiveResponses.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <Building2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Nenhuma resposta positiva encontrada</h3>
              <p className="text-muted-foreground text-sm">Tente ajustar os filtros ou aguarde mais respostas.</p>
            </div>
          ) : (
            positiveResponses.map((response, index) => (
              <motion.div 
                key={response.id || index} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <Card className="response-card shadow-lg overflow-hidden text-xs sm:text-sm">
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 bg-input/30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
                      <CardTitle className="text-sm sm:text-base text-primary flex items-center gap-2"><Building2 className="h-4 w-4 sm:h-5 sm:w-5" />{response.cdvName}</CardTitle>
                      <Badge className={`${getStatusColorClass(response.status)} text-white flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 text-xs rounded`}>{getStatusIcon(response.status)}{getStatusText(response.status)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground/80 mt-1">Respondido em {formatDate(response.responseDate)}</p>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {response.photoUrl && response.status === 'available' && (
                      <div className="mb-2 sm:mb-3">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />Foto da Peça:</h4>
                        <div className="flex justify-center items-center bg-black/20 rounded-md p-1 sm:p-2">
                           <img-replace src={response.photoUrl} alt={`Foto da peça ${procura.partName} de ${response.cdvName}`} className="max-h-32 sm:max-h-48 w-auto rounded-lg border border-border object-contain" />
                        </div>
                      </div>
                    )}
                    {response.message && (<p className="text-foreground mb-2 sm:mb-3 bg-input/50 p-2 rounded-md text-xs">{response.message}</p>)}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 mb-2 text-xs">
                      {response.price && response.status === 'available' && (<div className="flex items-center gap-1 text-green-500 font-semibold"><DollarSign className="h-3 w-3 sm:h-4 sm:w-4" /><span>R$ {response.price}</span></div>)}
                      {response.location && (<div className="flex items-center gap-1 text-primary"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" /><span>{response.location}</span></div>)}
                      {response.partType && (<div className="flex items-center gap-1 text-muted-foreground"><Wrench className="h-3 w-3 sm:h-4 sm:w-4" /><span>{getPartTypeText(response.partType)}</span></div>)}
                    </div>

                    <div className="text-xs text-muted-foreground/80 mb-2 space-y-0.5">
                      {response.cnpj && (<p className="flex items-center gap-1"><Info className="h-3 w-3"/> CNPJ: {response.cnpj}</p>)}
                      {response.address && (<p className="flex items-center gap-1"><MapPin className="h-3 w-3"/> Endereço: {response.address}</p>)}
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-x-3 gap-y-1 mb-2 text-xs">
                      {response.phone && (<a href={`tel:${response.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary"><Phone className="h-3 w-3 sm:h-4 sm:w-4" />{response.phone} <ExternalLink size={10} className="ml-0.5 opacity-70"/></a>)}
                      {response.email && (<a href={`mailto:${response.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary"><Mail className="h-3 w-3 sm:h-4 sm:w-4" />{response.email} <ExternalLink size={10} className="ml-0.5 opacity-70"/></a>)}
                    </div>

                    {response.status === 'available' && (
                      <Button onClick={() => onOpenChat({id: response.cdvId, name: response.cdvName, type: 'cdv'})} className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-1.5 text-xs sm:text-sm flex items-center gap-1 sm:gap-2"><MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />Iniciar Chat com CDV</Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
        <DialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-border pt-3 sm:pt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseModal;
