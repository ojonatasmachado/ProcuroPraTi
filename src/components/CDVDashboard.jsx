
import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Building2, Car, Clock, MapPin, DollarSign, MessageCircle, Send, Camera, Upload, ListFilter, History, Edit3, PackageSearch, CalendarDays, EyeOff, Eye, AlertTriangle, CheckCircle2, XCircle, Wrench, MessageSquare as ChatIcon, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CDVDashboard = ({ allProcuras, cdvResponses, onResponseSubmit, currentUser, vehicleData, onOpenChat, users }) => {
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
  const [currentView, setCurrentView] = useState('home'); // 'home', 'to-respond', 'responded'

  const unrespondedProcurasCount = useMemo(() => {
    return allProcuras.filter(p => !cdvResponses.some(myRes => myRes.id === p.id)).length;
  }, [allProcuras, cdvResponses]);

  const handlePhotoUpload = () => {
    toast({
      title: "🚧 Upload de Fotos Não Implementado",
      description: "Esta funcionalidade de upload de fotos ainda não foi implementada. Por favor, insira um URL de imagem por enquanto. Você pode solicitar a implementação completa no próximo prompt! 🚀",
      variant: "default",
      duration: 7000
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setResponseForm(prev => ({ ...prev, photoUrl: reader.result }));
        toast({ title: "Foto Carregada (Simulado)", description: "A foto foi carregada para pré-visualização." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResponseFormSubmit = (e) => {
    e.preventDefault();
    
    if (!responseForm.status) {
      toast({ title: "Status obrigatório", description: "Por favor, informe se a peça está disponível.", variant: "destructive" });
      return;
    }

    if (responseForm.status === 'available' && (!responseForm.partCondition || !responseForm.partType)) {
      toast({ title: "Informações obrigatórias", description: "Condição e tipo (original/paralela) da peça são obrigatórios.", variant: "destructive" });
      return;
    }

    if (selectedProcura.wantsPhotos && responseForm.status === 'available' && !responseForm.photoUrl) {
      toast({ title: "Foto obrigatória", description: "O usuário solicitou uma foto da peça. Por favor, adicione um URL da imagem.", variant: "destructive" });
      return;
    }

    const response = {
      id: isEditingResponse ? selectedProcura.myResponse.id : Date.now().toString(),
      searchId: selectedProcura.id,
      cdvId: currentUser.id,
      cdvName: currentUser.name, 
      responseDate: new Date().toISOString(),
      ...responseForm,
      message: responseForm.status === 'unavailable' ? 'Peça indisponível no momento.' : responseForm.message,
      cnpj: currentUser.cnpj,
      address: currentUser.address, 
      location: currentUser.address.split(',').slice(-2).join(',').trim(), 
      isReadByUser: false,
      isReadByCDV: true,
    };

    onResponseSubmit(selectedProcura.id, response);
    
    setResponseForm({ status: '', partCondition: '', partType: '', price: '', message: '', photoUrl: '' });
    setPhotoPreview(null);
    setSelectedProcura(null);
    setIsEditingResponse(false);

    toast({ title: `Resposta ${isEditingResponse ? 'atualizada' : 'enviada'} com sucesso! 🎉`, description: "Sua resposta foi registrada." });
  };

  const handleSelectProcura = (procura, isEdit = false) => {
    setSelectedProcura(procura);
    setIsEditingResponse(isEdit);
    if (isEdit && procura.myResponse) {
      setResponseForm({
        status: procura.myResponse.status || '', 
        partCondition: procura.myResponse.partCondition || '',
        partType: procura.myResponse.partType || '',
        price: procura.myResponse.price || '', 
        message: procura.myResponse.message || '',
        photoUrl: procura.myResponse.photoUrl || ''
      });
      if (procura.myResponse.photoUrl) setPhotoPreview(procura.myResponse.photoUrl);
    } else {
       setResponseForm({ status: '', partCondition: '', partType: '', price: '', message: '', photoUrl: '' });
       setPhotoPreview(null);
    }
    setCurrentView('response_form');
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  const getDaysRemaining = (procura) => {
    if (procura.status !== 'active') return 0;
    const endDate = new Date(procura.createdAt);
    endDate.setDate(endDate.getDate() + procura.duration);
    const remaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    return remaining > 0 ? remaining : 0;
  };

  const filteredProcurasToRespond = useMemo(() => {
    return allProcuras
      .filter(p => !cdvResponses.some(myRes => myRes.id === p.id))
      .filter(p => {
        const partNameMatch = filterPartName ? p.partName.toLowerCase().includes(filterPartName.toLowerCase()) : true;
        const vehicleMatch = filterVehicle ? 
          `${p.vehicleBrand} ${p.vehicleModel} ${p.vehicleYear}`.toLowerCase().includes(filterVehicle.toLowerCase()) : true;
        return partNameMatch && vehicleMatch;
      }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allProcuras, cdvResponses, filterPartName, filterVehicle]);

  const filteredCdvResponses = useMemo(() => {
    return cdvResponses.filter(p => {
      const partNameMatch = filterPartName ? p.partName.toLowerCase().includes(filterPartName.toLowerCase()) : true;
      const vehicleMatch = filterVehicle ? 
        `${p.vehicleBrand} ${p.vehicleModel} ${p.vehicleYear}`.toLowerCase().includes(filterVehicle.toLowerCase()) : true;
      return partNameMatch && vehicleMatch;
    }).sort((a,b) => new Date(b.myResponse.responseDate) - new Date(a.myResponse.responseDate));
  }, [cdvResponses, filterPartName, filterVehicle]);

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

  const renderProcuraCard = (procura, type) => {
    const hasResponded = type === 'responded';
    const response = hasResponded ? procura.myResponse : null;
    const user = users.find(u => u.id === procura.userId);

    return (
      <motion.div 
        key={procura.id} 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
        layout
      >
        <Card className="response-card hover:shadow-lg transition-all duration-300 flex flex-col h-full text-xs sm:text-sm">
          <CardHeader className="p-3 pb-2">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-sm sm:text-base text-foreground">{procura.partName}</CardTitle>
              {procura.wantsPhotos && (<Badge variant="outline" className="border-yellow-500 text-yellow-500 flex items-center gap-1 text-xs shrink-0"><Camera className="h-3 w-3" /> Fotos</Badge>)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Car className="h-3 w-3" />{procura.vehicleType} - {procura.vehicleBrand} {procura.vehicleModel} ({procura.vehicleYear || 'N/A'})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground/80"><Clock className="h-3 w-3" />{formatDate(procura.createdAt)}</div>
            <div className="flex items-center gap-1 text-xs text-orange-500"><CalendarDays className="h-3 w-3" /> {getDaysRemaining(procura)} dia(s) restante(s)</div>
          </CardHeader>
          <CardContent className="flex-grow p-3 text-xs">
            {procura.partDescription && <p className="text-foreground mb-2 line-clamp-2">{procura.partDescription}</p>}
            <div className="text-muted-foreground mb-1">
              Localidades da procura: {(procura.locations || []).map(l => l.label).join(', ') || 'Não especificado'}
            </div>
            {user && <p className="text-muted-foreground mb-2">Procurado por: {user.name}</p>}
            {hasResponded && response && (
              <div className="mt-1 p-2 bg-input/50 rounded text-xs">
                <p className="font-semibold text-foreground">Sua Resposta:</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  {getStatusIcon(response.status)}
                  Status: <span className={response.status === 'available' ? 'text-green-500' : response.status === 'unavailable' ? 'text-red-500' : 'text-yellow-500'}>{getStatusText(response.status)}</span>
                </p>
                {response.partCondition && <p className="text-muted-foreground">Condição: {getConditionText(response.partCondition)}</p>}
                {response.partType && <p className="text-muted-foreground">Tipo: {response.partType === 'original' ? 'Original' : 'Paralela'}</p>}
                {response.price && <p className="text-muted-foreground">Preço: R$ {response.price}</p>}
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  {response.isReadByUser ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3 text-orange-500" />}
                  {response.isReadByUser ? "Visualizada pelo usuário" : "Não visualizada"}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-3 pt-2 border-t border-border/50 flex flex-col sm:flex-row gap-2">
            <Button onClick={() => handleSelectProcura(procura, hasResponded)} className="w-full gradient-bg hover:opacity-90 text-primary-foreground text-xs py-1.5 h-auto">
              {hasResponded ? <Edit3 className="h-3 w-3 mr-1" /> : <Send className="h-3 w-3 mr-1" />}
              {hasResponded ? 'Editar Resposta' : 'Responder'}
            </Button>
            {user && (
              <Button variant="outline" onClick={() => onOpenChat(user.id)} className="w-full text-xs py-1.5 h-auto border-primary/70 text-primary hover:bg-primary/10">
                <ChatIcon className="h-3 w-3 mr-1" /> Chat
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  if (currentView === 'response_form' && selectedProcura) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Card className="glass-effect border-primary/30 max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-foreground text-lg sm:text-xl">{isEditingResponse ? 'Editar Resposta para:' : 'Responder Procura:'} {selectedProcura.partName}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setSelectedProcura(null); setIsEditingResponse(false); setCurrentView('home'); }} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary"><ArrowLeft className="h-4 w-4 mr-1"/>Voltar</Button>
            </div>
            <div className="text-muted-foreground text-sm">{selectedProcura.vehicleType} - {selectedProcura.vehicleBrand} {selectedProcura.vehicleModel} ({selectedProcura.vehicleYear || 'N/A'})</div>
            {selectedProcura.wantsPhotos && <Badge variant="outline" className="border-yellow-500 text-yellow-500 flex items-center gap-1 w-fit"><Camera className="h-4 w-4" /> Usuário solicitou fotos</Badge>}
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-input/50 rounded-lg text-sm">
              <h3 className="font-semibold mb-1 text-foreground">Detalhes da Procura:</h3>
              {selectedProcura.partDescription && <p className="text-muted-foreground mb-1">{selectedProcura.partDescription}</p>}
              {(selectedProcura.locations || []).length > 0 && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {(selectedProcura.locations || []).map(l => l.label).join(', ')}</p>}
            </div>
            <form onSubmit={handleResponseFormSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="status" className="block text-sm font-medium mb-2 text-muted-foreground">Status da Peça *</Label>
                <Select value={responseForm.status} onValueChange={(value) => setResponseForm({...responseForm, status: value })}>
                  <SelectTrigger id="status" className="bg-input border-border"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="available">✅ Disponível</SelectItem>
                    <SelectItem value="unavailable">❌ Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {responseForm.status === 'available' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="partCondition" className="block text-sm font-medium mb-2 text-muted-foreground">Condição da Peça *</Label>
                      <Select value={responseForm.partCondition} onValueChange={(value) => setResponseForm({...responseForm, partCondition: value})}>
                        <SelectTrigger id="partCondition" className="bg-input border-border"><SelectValue placeholder="Selecione a condição" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="new">🆕 Nova (sem uso)</SelectItem>
                          <SelectItem value="excellent">⭐ Excelente (quase nova)</SelectItem>
                          <SelectItem value="good">👍 Boa (pequenos desgastes)</SelectItem>
                          <SelectItem value="fair">⚠️ Regular (desgastes visíveis)</SelectItem>
                          <SelectItem value="poor">🔧 Ruim (precisa reparo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="partType" className="block text-sm font-medium mb-2 text-muted-foreground">Tipo da Peça *</Label>
                      <Select value={responseForm.partType} onValueChange={(value) => setResponseForm({...responseForm, partType: value})}>
                        <SelectTrigger id="partType" className="bg-input border-border"><SelectValue placeholder="Original ou Paralela" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="original">🔩 Original</SelectItem>
                          <SelectItem value="parallel">⚙️ Paralela</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedProcura.wantsPhotos && (
                    <div>
                      <Label htmlFor="photoUrl" className="block text-sm font-medium mb-2 text-muted-foreground">URL da Foto da Peça *</Label>
                      <div className="flex gap-2">
                        <Input id="photoUrl" type="url" placeholder="https://exemplo.com/imagem.jpg" value={responseForm.photoUrl} onChange={(e) => { setResponseForm({...responseForm, photoUrl: e.target.value}); setPhotoPreview(e.target.value); }} className="bg-input border-border"/>
                        <Button type="button" variant="outline" onClick={handlePhotoUpload} className="border-primary text-primary shrink-0"><Upload className="h-4 w-4 sm:mr-2"/> <span className="hidden sm:inline">Upload</span></Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      </div>
                      {photoPreview && <div className="mt-2"><img src={photoPreview} alt="Pré-visualização da peça" className="max-h-32 rounded-md border border-border" /></div>}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="price" className="block text-sm font-medium mb-2 text-muted-foreground">Preço (R$)</Label>
                    <Input id="price" type="number" placeholder="Ex: 250.00" value={responseForm.price} onChange={(e) => setResponseForm({...responseForm, price: e.target.value})} className="bg-input border-border"/>
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
                </>
              )}
               {responseForm.status === 'unavailable' && (
                  <p className="text-sm text-muted-foreground p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                    O campo de mensagem adicional é desabilitado quando a peça está indisponível. A mensagem padrão "Peça indisponível no momento." será enviada.
                  </p>
                )}
              <Button type="submit" className="w-full gradient-bg hover:opacity-90 text-primary-foreground font-semibold py-2.5 sm:py-3"><Send className="h-5 w-5 mr-2" /> {isEditingResponse ? 'Atualizar Resposta' : 'Enviar Resposta'}</Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2"><Building2 className="h-7 w-7 sm:h-8 sm:w-8" /> Painel CDV</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Responda às procuras de peças dos usuários e gerencie suas respostas com excelência.</p>
      </div>

      {currentView === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-effect hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2"><PackageSearch size={20}/> Procuras Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{unrespondedProcurasCount}</p>
              <p className="text-xs text-muted-foreground">Procuras aguardando sua resposta</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setCurrentView('to-respond')} className="w-full gradient-bg">Ver Procuras para Responder</Button>
            </CardFooter>
          </Card>
          <Card className="glass-effect hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2"><History size={20}/> Minhas Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{cdvResponses.length}</p>
              <p className="text-xs text-muted-foreground">Total de respostas enviadas</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setCurrentView('responded')} variant="outline" className="w-full">Ver Histórico de Respostas</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {currentView !== 'home' && (
        <>
          <Button onClick={() => setCurrentView('home')} variant="outline" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2"/> Voltar para Home CDV</Button>
          <Card className="glass-effect p-4">
            <CardHeader className="p-2 pb-3 sm:p-4 sm:pb-4">
                <CardTitle className="text-md sm:text-lg text-foreground">Filtrar Procuras</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <Label htmlFor="filterPartName" className="text-xs sm:text-sm text-muted-foreground mb-2 block">Nome da Peça</Label>
                    <Input 
                        id="filterPartName" 
                        placeholder="Ex: Farol, Motor..." 
                        value={filterPartName} 
                        onChange={(e) => setFilterPartName(e.target.value)}
                        className="bg-input border-border text-sm"
                    />
                </div>
                <div>
                    <Label htmlFor="filterVehicle" className="text-xs sm:text-sm text-muted-foreground mb-2 block">Veículo (Marca, Modelo, Ano)</Label>
                    <Input 
                        id="filterVehicle" 
                        placeholder="Ex: Fiat Palio 2010..." 
                        value={filterVehicle} 
                        onChange={(e) => setFilterVehicle(e.target.value)}
                        className="bg-input border-border text-sm"
                    />
                </div>
            </CardContent>
          </Card>

          <Tabs defaultValue={currentView} value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-input/70 border border-border">
              <TabsTrigger value="to-respond" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><ListFilter className="h-3 w-3 sm:h-4 sm:w-4" /> A Responder ({filteredProcurasToRespond.length})</TabsTrigger>
              <TabsTrigger value="responded" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500"><History className="h-3 w-3 sm:h-4 sm:w-4" /> Já Respondidas ({filteredCdvResponses.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="to-respond">
              {filteredProcurasToRespond.length === 0 ? (<div className="text-center py-12"><PackageSearch className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg sm:text-xl font-semibold text-foreground">Nenhuma procura para responder.</h3><p className="text-muted-foreground text-sm">Aguarde novas procuras ou ajuste seus filtros!</p></div>) 
              : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{filteredProcurasToRespond.map(procura => renderProcuraCard(procura, 'to-respond'))}</div>)}
            </TabsContent>
            <TabsContent value="responded">
               {filteredCdvResponses.length === 0 ? (<div className="text-center py-12"><MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg sm:text-xl font-semibold text-foreground">Você ainda não respondeu nenhuma procura.</h3><p className="text-muted-foreground text-sm">Suas respostas aparecerão aqui.</p></div>) 
               : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{filteredCdvResponses.map(procura => renderProcuraCard(procura, 'responded'))}</div>)}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default CDVDashboard;
