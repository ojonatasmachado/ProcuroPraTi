
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Users, Building2, PackageSearch, MessageSquare, BarChart3, ShieldCheck, TrendingUp, AlertTriangle, CheckSquare, MapPin, ThumbsDown, CheckCircle, XCircle, ListChecks, Mail, Phone, CalendarDays, Eye, Star, Filter as FilterIcon, Clock, Users2, BarChartHorizontalBig, DollarSign, Ban, History, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


const AdminDashboard = ({ procuras = [], users = [], companies = [], setCompanies, feedbacks = [], allStatesAndCities = [] }) => {
  const [selectedState, setSelectedState] = useState('all-states');
  const [selectedCity, setSelectedCity] = useState('all-cities');
  const [availableCities, setAvailableCities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [feedbackFilters, setFeedbackFilters] = useState({ type: 'all', userType: 'all' });
  const [companyManagementFilter, setCompanyManagementFilter] = useState('all');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [currentCompanyForReason, setCurrentCompanyForReason] = useState(null);
  const [validationReason, setValidationReason] = useState('');


  const states = useMemo(() => {
    const stateSet = new Set();
    allStatesAndCities.forEach(s => stateSet.add(s.value));
    return Array.from(stateSet).filter(Boolean).sort((a,b) => a.localeCompare(b));
  }, [allStatesAndCities]);

  useEffect(() => {
    if (selectedState && selectedState !== 'all-states') {
      const citiesFromData = allStatesAndCities.find(s => s.value === selectedState)?.cities.map(c => c.value) || [];
      setAvailableCities(citiesFromData.sort((a,b) => a.localeCompare(b)));
    } else {
      setAvailableCities([]);
    }
    setSelectedCity('all-cities');
  }, [selectedState, allStatesAndCities]);

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';
  const formatDateTime = (dateString) => dateString ? new Date(dateString).toLocaleString('pt-BR') : 'N/A';

  const filteredProcuras = useMemo(() => {
    return procuras.filter(p => {
      if (selectedState === 'all-states') return true;
      const pLocations = (p.locations || []).map(l => l.value.toLowerCase());
      const stateMatch = pLocations.some(loc => loc.includes(selectedState.toLowerCase()));
      if (selectedCity === 'all-cities') return stateMatch;
      const cityMatch = pLocations.some(loc => loc.startsWith(selectedCity.toLowerCase()) && loc.includes(selectedState.toLowerCase()));
      return cityMatch;
    });
  }, [procuras, selectedState, selectedCity]);
  
  const filteredCompaniesForManagement = useMemo(() => {
    return companies.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(companySearchTerm.toLowerCase());
      const cnpjMatch = (c.cnpj || '').includes(companySearchTerm);
      const emailMatch = (c.email || '').toLowerCase().includes(companySearchTerm.toLowerCase());
      const termMatch = companySearchTerm ? (nameMatch || cnpjMatch || emailMatch) : true;

      if (!termMatch) return false;

      const statusMatch = companyManagementFilter === 'all' || c.validationStatus === companyManagementFilter;
      if (!statusMatch) return false;

      if(selectedState === 'all-states') return true;
      const cServes = (c.servesLocations || [c.address || '']).map(l => l.toLowerCase());
      const stateMatch = cServes.some(loc => loc.includes(selectedState.toLowerCase()));
      if(selectedCity === 'all-cities') return stateMatch;
      return cServes.some(loc => loc.startsWith(selectedCity.toLowerCase()) && loc.includes(selectedState.toLowerCase()));
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [companies, selectedState, selectedCity, companySearchTerm, companyManagementFilter]);

  const totalProcuras = filteredProcuras.length;
  const totalResponses = filteredProcuras.reduce((acc, procura) => acc + (procura.responses || []).length, 0);
  const averageResponsesPerProcura = totalProcuras > 0 ? (totalResponses / totalProcuras).toFixed(1) : 0;

  const getCompanyStats = (companyId) => {
    const companyDetails = companies.find(c => c.id === companyId);
    const companyProcurasAssigned = procuras.filter(p => 
        p.status === 'active' && 
        ((p.locations || []).length === 0 || (p.locations || []).some(loc => (companyDetails?.servesLocations || []).includes(loc.value)))
    );
    const responsesSentByCompany = procuras.reduce((acc, p) => acc + (p.responses || []).filter(r => r.companyId === companyId).length, 0);
    const positiveResponsesByCompany = procuras.reduce((acc, p) => acc + (p.responses || []).filter(r => r.companyId === companyId && r.status === 'available').length, 0);
    const pendingResponsesForCompany = companyProcurasAssigned.filter(p => !(p.responses || []).some(r => r.companyId === companyId)).length;
    
    return { responsesSent: responsesSentByCompany, positiveResponses: positiveResponsesByCompany, pendingResponses: pendingResponsesForCompany };
  };

  const companiesWithPendingResponses = useMemo(() => {
    return companies.map(company => ({
      ...company,
      ...getCompanyStats(company.id)
    }))
    .filter(company => company.pendingResponses > 0 && company.validationStatus === 'validated')
    .sort((a,b) => b.pendingResponses - a.pendingResponses);
  }, [procuras, companies]);

  const stats = [
    { title: "Total de Procuras", value: procuras.length, icon: <PackageSearch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />, color: "primary" },
    { title: "Procuras Ativas (Global)", value: procuras.filter(s => s.status === 'active').length, icon: <PackageSearch className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />, color: "green-500" },
    { title: "Total Usuários", value: users.length, icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />, color: "pink-500" },
    { title: "Total Empresas", value: companies.length, icon: <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-teal-500" />, color: "teal-500" },
    { title: "Média Respostas/Procura", value: averageResponsesPerProcura, icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />, color: "orange-500" },
    { title: "Total Feedbacks", value: feedbacks.length, icon: <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />, color: "purple-500" },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
    })
  };

  const generateChartData = (dataType) => { return []; };
  const chartDataUsers = generateChartData('users');
  const chartDataProcuras = generateChartData('procuras');
  const chartDataPositiveResponses = generateChartData('positiveResponses');

  const renderChartPlaceholder = (title, data, icon, color) => (
    <Card className="glass-effect border-border/30 h-full flex flex-col">
      <CardHeader>
        <CardTitle className={`text-md sm:text-lg text-${color || 'primary'} flex items-center gap-2`}>
          {icon || <BarChart3 />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        <div className="h-32 sm:h-48 bg-input/30 rounded-md flex items-center justify-center">
          <p className="text-muted-foreground text-xs text-center">
            Gráfico de {title.toLowerCase()} funcional.<br/>(Dados simulados dos últimos 7 dias)
          </p>
        </div>
        {data.length > 0 && <ul className="text-xs mt-2 space-y-0.5 max-h-20 overflow-y-auto">
          {data.map(d => <li key={d.date}>{d.date}: {d.value}</li>)}
        </ul>}
      </CardContent>
    </Card>
  );
  
  const handleCompanyValidationStatusChange = (companyId, newStatus) => {
    if (newStatus === 'unauthorized') {
      setCurrentCompanyForReason(companyId);
      setShowReasonModal(true);
    } else {
      updateCompanyStatus(companyId, newStatus, '');
    }
  };

  const handleReasonSubmit = () => {
    if (!validationReason.trim()) {
      toast({ title: "Erro", description: "A justificativa é obrigatória para não autorizar.", variant: "destructive" });
      return;
    }
    updateCompanyStatus(currentCompanyForReason, 'unauthorized', validationReason);
    setShowReasonModal(false);
    setValidationReason('');
    setCurrentCompanyForReason(null);
  };

  const updateCompanyStatus = (companyId, status, reason) => {
    setCompanies(prevCompanies => 
      prevCompanies.map(company => 
        company.id === companyId ? { ...company, validationStatus: status, validationReason: reason } : company
      )
    );
    const company = companies.find(c => c.id === companyId);
    toast({ title: `Empresa ${company.name}`, description: `Status de validação alterado para ${status}.` });
  };

  const togglePaymentExemption = (companyId, months) => {
    setCompanies(prevCompanies =>
      prevCompanies.map(company => {
        if (company.id === companyId) {
          const newExemptionDate = new Date();
          newExemptionDate.setMonth(newExemptionDate.getMonth() + months);
          return { ...company, paymentExemptUntil: newExemptionDate.toISOString() };
        }
        return company;
      })
    );
    toast({ title: `Empresa ${companies.find(c => c.id === companyId).name}`, description: `Isenção de pagamento definida por ${months} meses.` });
  };

  const filteredFeedbacks = useMemo(() => {
    return feedbacks
      .filter(fb => {
        const typeMatch = feedbackFilters.type === 'all' || fb.type === feedbackFilters.type;
        const userTypeMatch = feedbackFilters.userType === 'all' || fb.userType === feedbackFilters.userType;
        return typeMatch && userTypeMatch;
      })
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [feedbacks, feedbackFilters]);

  const handleFeedbackFilterChange = (filterName, value) => {
    setFeedbackFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getValidationStatusBadge = (status) => {
    switch (status) {
      case 'validated': return <Badge variant="default" className="bg-green-600/90 border-green-700 text-xs px-1.5 py-0.5">Validado</Badge>;
      case 'pending': return <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs px-1.5 py-0.5">Pendente</Badge>;
      case 'unauthorized': return <Badge variant="destructive" className="bg-red-600/90 border-red-700 text-xs px-1.5 py-0.5">Não Autorizado</Badge>;
      default: return <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-3">
          <ShieldCheck className="h-7 w-7 sm:h-10 sm:w-10" />
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground text-sm sm:text-lg">Visão geral e gerenciamento da plataforma Procuro Pra Ti.</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8 bg-input/70 border border-border">
          <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Visão Geral</TabsTrigger>
          <TabsTrigger value="companyManagement" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Gerenciar Empresas</TabsTrigger>
          <TabsTrigger value="pendingResponses" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Empresas Pendentes</TabsTrigger>
          <TabsTrigger value="feedbacks" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Feedbacks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-effect border-border/30 mb-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2"><MapPin className="h-5 w-5"/>Filtro Regional (Visão Geral)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminStateFilterOverview" className="block text-sm font-medium mb-1 text-muted-foreground">Estado</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger id="adminStateFilterOverview" className="bg-input border-border w-full"><SelectValue placeholder="Todos os Estados" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                    <SelectItem value="all-states">Todos os Estados</SelectItem>
                    {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adminCityFilterOverview" className="block text-sm font-medium mb-1 text-muted-foreground">Cidade</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState || selectedState === 'all-states' || availableCities.length === 0}>
                  <SelectTrigger id="adminCityFilterOverview" className="bg-input border-border w-full"><SelectValue placeholder="Todas as Cidades" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                    <SelectItem value="all-cities">Todas as Cidades</SelectItem>
                    {availableCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.custom key={stat.title} variants={cardVariants} initial="hidden" animate="visible" custom={i}>
                <Card className={`glass-effect border-border/30 hover:shadow-lg hover:border-${stat.color}/50 transition-all duration-300 h-full flex flex-col`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-xs sm:text-sm font-medium text-muted-foreground`}>{stat.title}</CardTitle>
                    {React.cloneElement(stat.icon, { className: `h-5 w-5 sm:h-6 sm:w-6 text-${stat.color}`})}
                  </CardHeader>
                  <CardContent className="flex-grow flex items-center justify-center py-2 sm:py-4">
                    <div className={`font-bold text-foreground ${stat.isText ? 'text-md sm:text-xl text-center' : 'text-xl sm:text-3xl'}`}>{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.custom>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
            {renderChartPlaceholder("Novos Usuários (7d)", chartDataUsers, <Users2 className="text-pink-500"/>, 'pink-500')}
            {renderChartPlaceholder("Procuras Realizadas (7d)", chartDataProcuras, <PackageSearch className="text-primary"/>, 'primary')}
            {renderChartPlaceholder("Respostas Positivas (7d)", chartDataPositiveResponses, <CheckCircle className="text-green-500"/>, 'green-500')}
            {renderChartPlaceholder("Tempo Médio Login Usuário", [], <Clock className="text-blue-500"/>, 'blue-500')}
            {renderChartPlaceholder("Tempo Médio Login Empresa", [], <Clock className="text-teal-500"/>, 'teal-500')}
            {renderChartPlaceholder("Média Acessos Usuários (Semanal)", [], <BarChartHorizontalBig className="text-orange-500"/>, 'orange-500')}
          </div>
        </TabsContent>

        <TabsContent value="companyManagement">
          <Card className="glass-effect border-border/30">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2"><ListChecks className="h-5 w-5"/>Gerenciamento de Empresas</CardTitle>
              <CardDescription>Valide, visualize informações e acompanhe o desempenho das empresas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Input 
                  placeholder="Buscar empresa por nome, CNPJ ou email..."
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  className="bg-input border-border text-sm"
                />
                <Select value={companyManagementFilter} onValueChange={setCompanyManagementFilter}>
                  <SelectTrigger className="bg-input border-border text-sm"><SelectValue placeholder="Filtrar por Status" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="validated">Validados</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="unauthorized">Não Autorizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[500px] pr-3">
                {filteredCompaniesForManagement.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhuma empresa encontrada com os critérios.</p> :
                <div className="space-y-3">
                  {filteredCompaniesForManagement.map(company => (
                      <Card key={company.id} className="bg-input/50 border-border/50 text-xs">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-sm text-foreground">{company.name}</CardTitle>
                            {getValidationStatusBadge(company.validationStatus)}
                          </div>
                          <p className="text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"}</p>
                        </CardHeader>
                        <CardContent className="text-xs space-y-0.5 p-3">
                          <p className="flex items-center gap-1"><Mail size={12}/> {company.email}</p>
                          <p className="flex items-center gap-1"><Phone size={12}/> {company.phone || "Telefone não informado"}</p>
                          <p className="flex items-center gap-1"><MapPin size={12}/> {company.address || "Endereço não informado"}</p>
                          <p className="flex items-center gap-1"><CalendarDays size={12}/> Cadastrado em: {formatDate(company.createdAt)}</p>
                          {company.validationStatus === 'unauthorized' && company.validationReason && (
                            <p className="text-red-400 flex items-center gap-1"><Ban size={12}/> Motivo: {company.validationReason}</p>
                          )}
                          {company.paymentExemptUntil && new Date(company.paymentExemptUntil) > new Date() && <p className="text-green-500 flex items-center gap-1"><DollarSign size={12}/> Isento até: {formatDate(company.paymentExemptUntil)}</p>}
                        </CardContent>
                        <CardFooter className="p-3 pt-2 flex flex-col sm:flex-row gap-2">
                          <Select onValueChange={(status) => handleCompanyValidationStatusChange(company.id, status)} value={company.validationStatus || 'pending'}>
                            <SelectTrigger className="text-xs flex-1 h-7 bg-input border-border"><SelectValue placeholder="Alterar Status" /></SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="validated">Validar</SelectItem>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="unauthorized">Não Autorizar</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select onValueChange={(months) => togglePaymentExemption(company.id, parseInt(months))}>
                            <SelectTrigger className="text-xs flex-1 h-7 bg-input border-border"><SelectValue placeholder="Isentar Pagamento" /></SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="1">1 Mês</SelectItem>
                              <SelectItem value="3">3 Meses</SelectItem>
                              <SelectItem value="6">6 Meses</SelectItem>
                              <SelectItem value="12">12 Meses</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardFooter>
                      </Card>
                    )
                  )}
                </div>
                }
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendingResponses">
          <Card className="glass-effect border-border/30">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500"/>Empresas com Respostas Pendentes</CardTitle>
              <CardDescription>Lista de empresas validadas que têm procuras atribuídas e ainda não responderam.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-3">
                {companiesWithPendingResponses.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhuma empresa com respostas pendentes no momento. Ótimo!</p> :
                <div className="space-y-3">
                  {companiesWithPendingResponses.map(company => (
                      <Card key={company.id} className="bg-input/50 border-border/50 text-xs">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm text-foreground">{company.name}</CardTitle>
                            <Badge variant="destructive" className="text-xs">{company.pendingResponses} Pendente(s)</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"}</p>
                        </CardHeader>
                        <CardContent className="text-xs space-y-0.5 p-3">
                           <p className="flex items-center gap-1"><Mail size={12}/> {company.email}</p>
                           <p className="flex items-center gap-1"><Phone size={12}/> {company.phone || "Telefone não informado"}</p>
                           <p className="flex items-center gap-1"><MapPin size={12}/> {company.address || "Endereço não informado"}</p>
                           <p>Total Respostas: {company.responsesSent} | Positivas: {company.positiveResponses}</p>
                        </CardContent>
                        <CardFooter className="p-3 pt-2">
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast({title: "Em Breve!", description: "Funcionalidade de notificar empresa será implementada."})}>Notificar Empresa</Button>
                        </CardFooter>
                      </Card>
                  ))}
                </div>
                }
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedbacks">
          <Card className="glass-effect border-border/30">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2"><MessageSquare className="h-5 w-5"/>Feedbacks e Problemas</CardTitle>
              <CardDescription>Visualize os feedbacks e problemas relatados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Select value={feedbackFilters.type} onValueChange={(val) => handleFeedbackFilterChange('type', val)}>
                  <SelectTrigger className="bg-input border-border text-sm"><SelectValue placeholder="Tipo de Feedback" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="problem">Problema</SelectItem>
                    <SelectItem value="suggestion_popup">Sugestão (Popup)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={feedbackFilters.userType} onValueChange={(val) => handleFeedbackFilterChange('userType', val)}>
                  <SelectTrigger className="bg-input border-border text-sm"><SelectValue placeholder="Tipo de Usuário" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    <SelectItem value="user">Usuário Final</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[500px] pr-3">
                {filteredFeedbacks.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum feedback encontrado com os filtros atuais.</p> :
                <div className="space-y-4">
                  {filteredFeedbacks.map(fb => (
                    <Card key={fb.id} className="bg-input/50 border-border/50">
                      <CardHeader className="pb-2 p-3">
                        <div className="flex justify-between items-center">
                           <CardTitle className="text-sm text-foreground capitalize">{fb.type.replace('_', ' ')}</CardTitle>
                           <Badge variant="outline" className="text-xs">{fb.userType === 'user' ? 'Usuário' : 'Empresa'}: {fb.userName}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(fb.createdAt)}</p>
                      </CardHeader>
                      <CardContent className="text-sm p-3">
                        <p className="text-foreground whitespace-pre-wrap">{fb.text}</p>
                        {fb.contact && <p className="text-xs text-muted-foreground mt-1">Contato: {fb.contact}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                }
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground flex items-center gap-2">
              <Edit className="h-6 w-6" />
              Justificativa para Não Autorizar
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="validationReason" className="block text-sm font-medium mb-2 text-muted-foreground">
              Motivo da não autorização (obrigatório):
            </Label>
            <Textarea
              id="validationReason"
              value={validationReason}
              onChange={(e) => setValidationReason(e.target.value)}
              placeholder="Ex: Documentação incompleta, informações inconsistentes, etc."
              className="bg-input border-border min-h-[80px]"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowReasonModal(false); setValidationReason(''); setCurrentCompanyForReason(null); }} className="border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary">
              Cancelar
            </Button>
            <Button onClick={handleReasonSubmit} className="gradient-bg hover:opacity-90 text-primary-foreground">
              Confirmar Não Autorização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
