
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Clock, Image as ImageIcon, MessageSquare, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const getPartTypeText = (type) => {
    if (type === 'original') return 'Original';
    if (type === 'parallel') return 'Paralela';
    return type || 'Não informado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-foreground">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg sm:text-2xl text-foreground mb-1">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {positiveResponses.map((response, index) => (
                <motion.div
                  key={response.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <Card className="response-card shadow-lg overflow-hidden text-xs sm:text-sm h-full flex flex-col">
                    <CardContent className="p-3 sm:p-4 flex gap-3 flex-1">
                      {response.photoUrl ? (
                        <img src={response.photoUrl} alt={`Foto da peça ${procura.partName} de ${response.companyName}`} className="w-16 h-16 rounded-lg border border-border object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-border bg-popover flex items-center justify-center shrink-0 text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-foreground text-sm truncate flex items-center gap-1"><Building2 className="h-3.5 w-3.5 shrink-0" />{response.companyName}</span>
                          {response.price && (<span className="font-extrabold text-accent-agile text-sm shrink-0">R$ {response.price}</span>)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-muted-foreground">
                          {response.partType && (<span className="flex items-center gap-0.5"><Wrench className="h-3 w-3" />{getPartTypeText(response.partType)}</span>)}
                          {response.location && (<span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{response.location}</span>)}
                        </div>
                        {response.message && (<p className="text-foreground/90 mt-2 bg-popover p-2 rounded-md text-xs line-clamp-3">{response.message}</p>)}
                        <p className="text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(response.responseDate)}</p>
                        <Button onClick={() => onOpenChat({ id: response.companyId, name: response.companyName, type: 'company' })} size="sm" className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />Conversar
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
    </Dialog>
  );
};

export default ResponseModal;
