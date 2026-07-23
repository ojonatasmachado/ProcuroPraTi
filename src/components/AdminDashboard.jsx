
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Users, Building2, PackageSearch, MessageSquare, BarChart3, ShieldCheck, TrendingUp, AlertTriangle, CheckSquare, MapPin, ThumbsDown, CheckCircle, XCircle, ListChecks, Mail, Phone, CalendarDays, Eye, Star, Filter as FilterIcon, Clock, Users2, BarChartHorizontalBig, DollarSign, Ban, History, Edit, Trophy, Car, Activity, Award, MapPinned, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import useScrollToTop from '@/hooks/useScrollToTop';
import CatalogAdminPanel from '@/components/CatalogAdminPanel';
import PlansAdminPanel from '@/components/PlansAdminPanel';


const AdminDashboard = ({ procuras = [], users = [], companies = [], setCompanies, feedbacks = [], registrationProgress = [], allStatesAndCities = [], readOnly = false }) => {
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
  const [showLocationHealth, setShowLocationHealth] = useState(false);
  useScrollToTop(activeTab);


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

  const businessMetrics = useMemo(() => {
    const responseCounts = new Map(companies.map(company => [company.id, { responses: 0, positive: 0 }]));
    procuras.forEach(procura => {
      (procura.responses || []).forEach(response => {
        if (!responseCounts.has(response.companyId)) return;
        const companyCount = responseCounts.get(response.companyId);
        companyCount.responses += 1;
        if (response.status === 'available') companyCount.positive += 1;
      });
    });

    const companyRanking = companies.map(company => ({
      id: company.id,
      name: company.name,
      accesses: Array.isArray(company.accessHistory) ? company.accessHistory.length : 0,
      responses: responseCounts.get(company.id)?.responses || 0,
      positive: responseCounts.get(company.id)?.positive || 0,
    }));
    const totalAccesses = companyRanking.reduce((sum, company) => sum + company.accesses, 0);
    const totalCompanyResponses = companyRanking.reduce((sum, company) => sum + company.responses, 0);

    const vehicleCounts = new Map();
    procuras.filter(procura => procura.vehicleType === 'car').forEach(procura => {
      const label = [procura.vehicleBrand, procura.vehicleModel].filter(Boolean).join(' ') || 'Não informado';
      vehicleCounts.set(label, (vehicleCounts.get(label) || 0) + 1);
    });

    const mostSearchedCars = [...vehicleCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      averageAccesses: companies.length ? (totalAccesses / companies.length).toFixed(1) : '0.0',
      averageResponses: companies.length ? (totalCompanyResponses / companies.length).toFixed(1) : '0.0',
      totalAccesses,
      mostResponsive: [...companyRanking].sort((a, b) => b.responses - a.responses || b.positive - a.positive || a.name.localeCompare(b.name)).slice(0, 10),
      leastResponsive: [...companyRanking].sort((a, b) => a.responses - b.responses || a.name.localeCompare(b.name)).slice(0, 10),
      mostPositive: [...companyRanking].sort((a, b) => b.positive - a.positive || b.responses - a.responses || a.name.localeCompare(b.name)).slice(0, 10),
      distinctSearchedCars: vehicleCounts.size,
      mostSearchedCars: mostSearchedCars.slice(0, 10),
      searchesWithoutPositive: procuras.filter(procura => !(procura.responses || []).some(response => response.status === 'available')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    };
  }, [companies, procuras]);

  const registrationMetrics = useMemo(() => {
    const incomplete = registrationProgress.filter(item => item.stage !== 'completed');
    return {
      started: registrationProgress.length,
      completed: registrationProgress.filter(item => item.stage === 'completed').length,
      incomplete,
      byStage: ['personal', 'address', 'vehicle'].map(stage => ({ stage, count: incomplete.filter(item => item.stage === stage).length })),
    };
  }, [registrationProgress]);

  const locationHealth = useMemo(() => {
    const companyLocations = companies.map(item => ({
      kind: 'company',
      source: item.locationSource || 'legacy',
      valid: [item.latitude, item.longitude].every(Number.isFinite),
      createdAt: item.createdAt,
    }));
    const searchLocations = procuras.map(item => ({
      kind: 'search',
      source: item.searchLocationSource || 'legacy',
      valid: [item.searchLatitude, item.searchLongitude].every(Number.isFinite),
      createdAt: item.createdAt,
    }));
    const locations = [...companyLocations, ...searchLocations];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentFailures = locations.filter(item => !item.valid && new Date(item.createdAt || 0).getTime() >= sevenDaysAgo).length;
    const precise = locations.filter(item => item.valid).length;
    const precisionRate = locations.length ? Math.round((precise / locations.length) * 100) : 100;
    const sourceCounts = locations.reduce((counts, item) => ({ ...counts, [item.source]: (counts[item.source] || 0) + 1 }), {});
    const status = recentFailures === 0 && precisionRate >= 95 ? 'normal' : precisionRate >= 80 ? 'attention' : 'critical';
    return { total: locations.length, precisionRate, recentFailures, sourceCounts, status };
  }, [companies, procuras]);

  const renderCompanyRanking = (title, items, field, valueLabel, icon) => (
    <Card className="glass-effect border-border/30 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {items.map((company, index) => (
            <li key={company.id} className="flex items-center justify-between gap-3 rounded-md bg-input/50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate"><strong className="mr-2 text-primary">{index + 1}.</strong>{company.name}</span>
              <Badge variant="secondary" className="shrink-0">{company[field]} {valueLabel}</Badge>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );

  const stats = [
    { title: "Total de Procuras", value: procuras.length, icon: <PackageSearch className="h-5 w-5 text-primary sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-primary/50' },
    { title: "Procuras Ativas (Global)", value: procuras.filter(s => s.status === 'active').length, icon: <PackageSearch className="h-5 w-5 text-success sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-success/50' },
    { title: "Total Usuários", value: users.length, icon: <Users className="h-5 w-5 text-primary sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-primary/50' },
    { title: "Total Empresas", value: companies.length, icon: <Building2 className="h-5 w-5 text-accent-agile sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-accent-agile/50' },
    { title: "Média Respostas/Procura", value: averageResponsesPerProcura, icon: <TrendingUp className="h-5 w-5 text-warning sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-warning/50' },
    { title: "Total Feedbacks", value: feedbacks.length, icon: <MessageSquare className="h-5 w-5 text-primary sm:h-6 sm:w-6" />, hoverBorder: 'hover:border-primary/50' },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
    })
  };

  const buildSevenDayData = (items, getDate) => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: date.toISOString().slice(0, 10), date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: 0 };
    });
    const byKey = new Map(days.map(day => [day.key, day]));
    items.forEach(item => {
      const value = getDate(item);
      if (!value) return;
      const key = new Date(value).toISOString().slice(0, 10);
      if (byKey.has(key)) byKey.get(key).value += 1;
    });
    return days;
  };
  const chartDataUsers = buildSevenDayData(users, user => user.createdAt);
  const chartDataProcuras = buildSevenDayData(procuras, procura => procura.createdAt);
  const positiveResponses = procuras.flatMap(procura => (procura.responses || []).filter(response => response.status === 'available'));
  const chartDataPositiveResponses = buildSevenDayData(positiveResponses, response => response.responseDate);

  const renderSevenDayChart = (title, data, icon) => {
    const maximum = Math.max(...data.map(item => item.value), 1);
    return (
    <Card className="glass-effect border-border/30 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-md sm:text-lg text-foreground flex items-center gap-2">
          {icon || <BarChart3 />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-end gap-2 h-44">
        {data.map(item => <div key={item.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1"><span className="text-xs font-semibold text-foreground">{item.value}</span><div className="w-full rounded-t bg-primary min-h-[3px]" style={{ height: `${Math.max(3, (item.value / maximum) * 100)}%` }} /><span className="text-[10px] text-muted-foreground">{item.date}</span></div>)}
      </CardContent>
    </Card>
    );
  };
  
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
      case 'validated': return <Badge variant="default" className="border-success bg-success text-xs text-success-foreground px-1.5 py-0.5">Validado</Badge>;
      case 'pending': return <Badge variant="outline" className="border-warning text-warning text-xs px-1.5 py-0.5">Pendente</Badge>;
      case 'unauthorized': return <Badge variant="destructive" className="border-destructive-foreground/40 text-xs px-1.5 py-0.5">Não Autorizado</Badge>;
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto mb-6 sm:mb-8 bg-input/70 border border-border">
          <TabsTrigger value="overview" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Visão geral</TabsTrigger>
          <TabsTrigger value="metrics" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Métricas</TabsTrigger>
          <TabsTrigger value="companyManagement" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Empresas</TabsTrigger>
          <TabsTrigger value="pendingResponses" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Pendências</TabsTrigger>
          <TabsTrigger value="feedbacks" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Feedbacks</TabsTrigger>
          <TabsTrigger value="catalog" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Catálogo</TabsTrigger>
          <TabsTrigger value="plans" className="min-h-11 whitespace-normal py-2 text-xs sm:text-sm">Planos</TabsTrigger>
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

          <button type="button" onClick={() => setShowLocationHealth(true)} className="mb-6 flex min-h-20 w-full items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${locationHealth.status === 'normal' ? 'bg-accent-agile/15 text-accent-agile' : locationHealth.status === 'attention' ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'}`}>
              <MapPinned className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Saúde da localização</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{locationHealth.precisionRate}% com coordenadas válidas · {locationHealth.recentFailures} falha(s) nos últimos 7 dias</span>
            </span>
            <Badge variant="outline" className={`hidden shrink-0 sm:inline-flex ${locationHealth.status === 'normal' ? 'border-accent-agile/50 text-accent-agile' : locationHealth.status === 'attention' ? 'border-warning/50 text-warning' : 'border-danger/50 text-danger'}`}>{locationHealth.status === 'normal' ? 'Normal' : locationHealth.status === 'attention' ? 'Atenção' : 'Crítico'}</Badge>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.custom key={stat.title} variants={cardVariants} initial="hidden" animate="visible" custom={i}>
                <Card className={`glass-effect border-border/30 hover:shadow-lg ${stat.hoverBorder} transition-all duration-300 h-full flex flex-col`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-xs sm:text-sm font-medium text-muted-foreground`}>{stat.title}</CardTitle>
                    {stat.icon}
                  </CardHeader>
                  <CardContent className="flex-grow flex items-center justify-center py-2 sm:py-4">
                    <div className={`font-bold text-foreground ${stat.isText ? 'text-md sm:text-xl text-center' : 'text-xl sm:text-3xl'}`}>{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.custom>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
            {renderSevenDayChart("Novos Usuários (7d)", chartDataUsers, <Users2 className="text-primary"/>)}
            {renderSevenDayChart("Procuras Realizadas (7d)", chartDataProcuras, <PackageSearch className="text-primary"/>)}
            {renderSevenDayChart("Respostas Positivas (7d)", chartDataPositiveResponses, <CheckCircle className="text-success"/>)}
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="glass-effect border-border/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Média de acessos por empresa</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{businessMetrics.averageAccesses}</p><p className="text-xs text-muted-foreground">{businessMetrics.totalAccesses} logins registrados desde o início da medição</p></CardContent></Card>
            <Card className="glass-effect border-border/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary"/>Média de respostas por empresa</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{businessMetrics.averageResponses}</p><p className="text-xs text-muted-foreground">Considera todas as empresas cadastradas</p></CardContent></Card>
            <Card className="glass-effect border-border/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning"/>Sem resposta positiva</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{businessMetrics.searchesWithoutPositive.length}</p><p className="text-xs text-muted-foreground">Procuras sem nenhuma oferta disponível</p></CardContent></Card>
            <Card className="glass-effect border-border/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4 text-accent-agile"/>Carros diferentes procurados</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{businessMetrics.distinctSearchedCars}</p><p className="text-xs text-muted-foreground">Ranking exibe os 10 mais procurados</p></CardContent></Card>
            <Card className="glass-effect border-warning/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-warning"/>Cadastros não concluídos</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{registrationMetrics.incomplete.length}</p><p className="text-xs text-muted-foreground">De {registrationMetrics.started} pessoas que iniciaram</p></CardContent></Card>
          </div>

          <Card className="glass-effect border-border/30 mb-6">
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Users className="h-5 w-5 text-warning"/>Funil de cadastro de clientes</CardTitle><CardDescription>{registrationMetrics.completed} cadastros concluídos e {registrationMetrics.incomplete.length} ainda em andamento.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {registrationMetrics.byStage.map(({ stage, count }) => <div key={stage} className="rounded-lg bg-input/50 p-3"><p className="text-xs text-muted-foreground">{({ personal: 'Dados pessoais', address: 'Endereço', vehicle: 'Veículo' })[stage]}</p><p className="mt-1 text-2xl font-bold text-foreground">{count}</p><p className="text-xs text-muted-foreground">não concluíram nesta etapa</p></div>)}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {renderCompanyRanking('Quem mais responde', businessMetrics.mostResponsive, 'responses', 'respostas', <Trophy className="h-5 w-5 text-warning" />)}
            {renderCompanyRanking('Quem menos responde', businessMetrics.leastResponsive, 'responses', 'respostas', <ThumbsDown className="h-5 w-5 text-warning" />)}
            {renderCompanyRanking('Mais respostas positivas', businessMetrics.mostPositive, 'positive', 'positivas', <Award className="h-5 w-5 text-accent-agile" />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-effect border-border/30">
              <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Car className="h-5 w-5 text-primary"/>Carros mais procurados</CardTitle></CardHeader>
              <CardContent><ol className="space-y-2">{businessMetrics.mostSearchedCars.map((vehicle, index) => <li key={vehicle.name} className="flex items-center justify-between gap-3 rounded-md bg-input/50 px-3 py-2 text-sm"><span className="truncate"><strong className="mr-2 text-primary">{index + 1}.</strong>{vehicle.name}</span><Badge variant="secondary">{vehicle.count} procuras</Badge></li>)}</ol></CardContent>
            </Card>
            <Card className="glass-effect border-border/30">
              <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning"/>Procuras sem resposta positiva</CardTitle><CardDescription>Inclui procuras sem respostas e procuras com apenas respostas indisponíveis.</CardDescription></CardHeader>
              <CardContent><ScrollArea className="h-[420px] pr-3">{businessMetrics.searchesWithoutPositive.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Todas as procuras receberam ao menos uma resposta positiva.</p> : <div className="space-y-2">{businessMetrics.searchesWithoutPositive.map(procura => <div key={procura.id} className="rounded-md bg-input/50 px-3 py-2"><div className="flex justify-between gap-2"><p className="font-medium text-sm text-foreground">{procura.partName}</p><Badge variant="outline" className="shrink-0">{(procura.responses || []).length} respostas</Badge></div><p className="text-xs text-muted-foreground">{procura.vehicleBrand} {procura.vehicleModel} • {formatDate(procura.createdAt)}</p></div>)}</div>}</ScrollArea></CardContent>
            </Card>
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
                            <p className="text-danger flex items-center gap-1"><Ban size={12}/> Motivo: {company.validationReason}</p>
                          )}
                          {company.paymentExemptUntil && new Date(company.paymentExemptUntil) > new Date() && <p className="text-success flex items-center gap-1"><DollarSign size={12}/> Isento até: {formatDate(company.paymentExemptUntil)}</p>}
                        </CardContent>
                        {!readOnly && <CardFooter className="p-3 pt-2 flex flex-col sm:flex-row gap-2">
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
                        </CardFooter>}
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
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning"/>Empresas com Respostas Pendentes</CardTitle>
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
              <CardDescription>Visualize avaliações, problemas e respostas de “Queremos ouvir você”.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Select value={feedbackFilters.type} onValueChange={(val) => handleFeedbackFilterChange('type', val)}>
                  <SelectTrigger className="bg-input border-border text-sm"><SelectValue placeholder="Tipo de Feedback" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="problem">Problema</SelectItem>
                    <SelectItem value="rating">Avaliação</SelectItem>
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
                           <CardTitle className="text-sm text-foreground">{fb.type === 'suggestion_popup' ? 'Queremos ouvir você' : fb.type === 'problem' ? 'Problema' : 'Avaliação'}</CardTitle>
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
        <TabsContent value="catalog">
          <CatalogAdminPanel />
        </TabsContent>
        <TabsContent value="plans">
          <PlansAdminPanel companies={companies} />
        </TabsContent>
      </Tabs>

      <Dialog open={showLocationHealth} onOpenChange={setShowLocationHealth}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><MapPinned className="h-6 w-6 text-primary" />Saúde da localização</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-input/40 p-3"><p className="text-xs text-muted-foreground">Coordenadas válidas</p><p className="mt-1 text-2xl font-extrabold text-foreground">{locationHealth.precisionRate}%</p></div>
              <div className="rounded-xl border border-border bg-input/40 p-3"><p className="text-xs text-muted-foreground">Falhas em 7 dias</p><p className="mt-1 text-2xl font-extrabold text-foreground">{locationHealth.recentFailures}</p></div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-foreground">Origem das localizações</p>
              <div className="space-y-2 text-sm">
                {[
                  ['gps', 'GPS do aparelho'],
                  ['cep', 'CEP da empresa'],
                  ['manual', 'Ponto ajustado'],
                  ['city_center', 'Centro da cidade'],
                  ['legacy', 'Registros anteriores'],
                ].map(([source, label]) => (
                  <div key={source} className="flex items-center justify-between rounded-lg bg-input/40 px-3 py-2"><span className="text-muted-foreground">{label}</span><Badge variant="secondary">{locationHealth.sourceCounts[source] || 0}</Badge></div>
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">O painel mostra somente os indicadores úteis. Carregamentos internos e cálculos de distância permanecem ocultos enquanto estiverem dentro do funcionamento esperado.</p>
          </div>
          <DialogFooter><Button type="button" onClick={() => setShowLocationHealth(false)} className="w-full sm:w-auto">Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
