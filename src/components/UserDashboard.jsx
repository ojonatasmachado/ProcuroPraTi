
import React, { useState, useMemo, useEffect } from 'react';
import SearchForm from '@/components/SearchForm';
import ResponseModal from '@/components/ResponseModal';
import { History, Bell, Clock, PackagePlus, CheckCircle, RotateCcw, Eye } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useScrollToTop from '@/hooks/useScrollToTop';
import { getSearchRemainingMs } from '@/lib/searchDuration';
import DashboardSectionTabs from '@/components/DashboardSectionTabs';

const UserDashboard = ({ userProcuras, onProcuraCreate, onProcuraUpdate, onPhotoUpload, onProcuraStatusChange, onMarkResponseAsRead, currentUser, allStatesAndCities, vehicleData, onOpenChat, unreadNotifications, companies = [], openResponsesForProcuraId = null, onPushDestinationHandled, myRatings = {}, onSubmitRating }) => {
  const [selectedProcura, setSelectedProcura] = useState(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'new_search_form', 'active_searches', 'finished_searches'
  const [procuraBeingEdited, setProcuraBeingEdited] = useState(null);
  const [reopenAsNew, setReopenAsNew] = useState(false);
  const [finishingProcuraId, setFinishingProcuraId] = useState(null);
  useScrollToTop(currentView);

  const handleViewResponses = (procura) => {
    setSelectedProcura(procura);
    setIsResponseModalOpen(true);
    // Mark notifications for this procura as read when responses are viewed
    const relatedNotifications = unreadNotifications.filter(n => n.procuraId === procura.id);
    relatedNotifications.forEach(n => onMarkResponseAsRead(n.procuraId, n.responseId));
  };

  const activeProcuras = useMemo(() => userProcuras.filter(s => s.status === 'active').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)), [userProcuras]);
  const finishedProcuras = useMemo(() => userProcuras.filter(s => s.status === 'finished').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)), [userProcuras]);

  useEffect(() => {
    if (!openResponsesForProcuraId) return;
    const procura = userProcuras.find(item => item.id === openResponsesForProcuraId);
    if (!procura) return;

    setCurrentView(procura.status === 'finished' ? 'finished_searches' : 'home');
    handleViewResponses(procura);
    onPushDestinationHandled?.();
  }, [openResponsesForProcuraId, userProcuras, onPushDestinationHandled]);

  const totalUnreadInActive = unreadNotifications.filter(n => activeProcuras.some(ap => ap.id === n.procuraId)).length;

  const markAsFinished = async (procuraId) => {
    if (finishingProcuraId) return;
    setFinishingProcuraId(procuraId);
    const completed = await onProcuraStatusChange(procuraId, 'finished');
    setFinishingProcuraId(null);
    if (completed) toast({ title: "Procura finalizada!", description: "A procura foi movida para o histórico."});
  };
  
  const handleCreateNewProcura = async (newProcuraData) => {
    const created = procuraBeingEdited && !reopenAsNew
      ? await onProcuraUpdate(procuraBeingEdited.id, newProcuraData)
      : await onProcuraCreate(newProcuraData);
    if (created) setCurrentView('home');
    if (created) setProcuraBeingEdited(null);
    if (created) setReopenAsNew(false);
    return created;
  };

  const reopenWithChanges = (procura) => {
    setProcuraBeingEdited(procura);
    setReopenAsNew(true);
    setCurrentView('new_search_form');
  };

  const formatRemaining = (procura) => {
    const remaining = getSearchRemainingMs(procura);
    if (remaining <= 0) return 'encerrando';
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    return days > 0 ? `${days} dia${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}` : `${hours}h restantes`;
  };

  const renderOverviewView = (showFinished = false) => {
    const visibleProcuras = showFinished ? finishedProcuras : activeProcuras;
    return <div className="mx-auto max-w-2xl space-y-3 pb-28">
      <div className="flex items-baseline justify-between gap-3">
        <div><h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{showFinished ? 'Histórico de procuras' : 'Minhas procuras'}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{showFinished ? 'Consulte respostas, conversas ou repita uma procura.' : 'Acompanhe suas procuras ativas e compare as melhores respostas.'}</p></div>
        <span className="shrink-0 text-xs text-muted-foreground">{visibleProcuras.length} {showFinished ? 'finalizada(s)' : 'em andamento'}</span>
      </div>
      <DashboardSectionTabs value={showFinished ? 'finished' : 'active'} onChange={(value) => setCurrentView(value === 'finished' ? 'finished_searches' : 'home')} items={[{ value: 'active', label: 'Ativas', count: activeProcuras.length, icon: Clock }, { value: 'finished', label: 'Finalizadas', count: finishedProcuras.length, icon: History }]} />
      {visibleProcuras.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-10 text-center"><BrandMark className="mx-auto mb-3 h-12 w-12 rounded-xl" /><p className="font-semibold text-foreground">{showFinished ? 'Nenhuma procura finalizada.' : 'Você ainda não tem procuras ativas.'}</p><p className="mt-1 text-sm text-muted-foreground">{showFinished ? 'Quando você finalizar uma procura, todo o histórico aparecerá aqui.' : 'Crie uma procura para receber respostas de empresas da sua região.'}</p></CardContent></Card>
      ) : visibleProcuras.map(procura => {
        const responses = (procura.responses || []).filter(response => response.status === 'available').length;
        return <Card key={procura.id} className={`overflow-hidden border-border border-l-[3px] bg-card shadow-sm ${showFinished ? 'border-l-muted-foreground' : 'border-l-primary'}`}><CardContent className="p-3.5"><button type="button" onClick={() => handleViewResponses(procura)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div className="min-w-0 flex-1"><p className="line-clamp-2 min-h-10 text-lg font-extrabold leading-5 tracking-tight text-foreground">{procura.partName}</p><p className="mt-1 flex min-h-8 items-start gap-1 text-xs leading-4 text-muted-foreground">{procura.vehicleBrand} {procura.vehicleModel} {procura.vehicleYear ? `(${procura.vehicleYear})` : ''}{!showFinished && <><span>·</span><Clock className="h-3 w-3 shrink-0" />{formatRemaining(procura)}</>}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${responses > 0 ? 'bg-accent-agile text-accent-agile-foreground shadow-sm' : 'bg-secondary text-muted-foreground'}`}>{responses > 0 ? `${responses} resposta${responses === 1 ? '' : 's'}` : 'Sem respostas'}</span></button><div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-2"><Button type="button" variant={showFinished ? 'outline' : 'default'} onClick={() => handleViewResponses(procura)} className={`min-h-11 text-xs font-bold ${showFinished ? '' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}><Eye className="mr-1.5 h-4 w-4" />{showFinished ? 'Ver histórico' : 'Ver respostas'}</Button>{showFinished ? <Button type="button" onClick={() => reopenWithChanges(procura)} className="min-h-11 text-xs"><RotateCcw className="mr-1.5 h-4 w-4" />Reabrir e ajustar</Button> : <Button type="button" variant="outline" disabled={Boolean(finishingProcuraId)} onClick={() => markAsFinished(procura.id)} className="min-h-11 border-warning/60 text-xs text-warning hover:bg-warning/10"><CheckCircle className="mr-1.5 h-4 w-4" />{finishingProcuraId === procura.id ? <span className="inline-flex gap-1" aria-label="Finalizando"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" /></span> : 'Finalizar'}</Button>}</div></CardContent></Card>;
      })}
      {!showFinished && totalUnreadInActive > 0 && <p className="flex items-center justify-center gap-1 text-xs font-medium text-accent-agile"><Bell className="h-3.5 w-3.5" />Você tem {totalUnreadInActive} resposta(s) nova(s).</p>}
    </div>;
  };

  const renderSearchFormView = () => (
     <SearchForm 
        onProcuraCreate={handleCreateNewProcura} 
        onPhotoUpload={onPhotoUpload}
        currentUser={currentUser} 
        allStatesAndCities={allStatesAndCities}
        vehicleData={vehicleData}
        onGoBack={() => { setProcuraBeingEdited(null); setReopenAsNew(false); setCurrentView('home'); }}
        editingProcura={procuraBeingEdited}
        reopeningProcura={reopenAsNew}
      />
  );

  return (
    <div className="space-y-6 sm:space-y-10" id="user-dashboard-tabs">
      {(currentView === 'home' || currentView === 'active_searches') && renderOverviewView(false)}
      {currentView === 'finished_searches' && renderOverviewView(true)}
      {currentView === 'new_search_form' && renderSearchFormView()}
      {currentView !== 'new_search_form' && <Button type="button" onClick={() => setCurrentView('new_search_form')} className="safe-floating-bottom fixed bottom-6 left-4 z-40 min-h-12 rounded-full px-5 text-sm font-bold text-primary-foreground ring-4 ring-background shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:left-1/2 sm:-translate-x-1/2"><PackagePlus className="mr-2 h-5 w-5" />Criar nova procura</Button>}

      <ResponseModal
        procura={selectedProcura}
        isOpen={isResponseModalOpen}
        onClose={() => {
          setIsResponseModalOpen(false);
          setSelectedProcura(null);
        }}
        onMarkAsRead={onMarkResponseAsRead}
        onOpenChat={onOpenChat}
        onEditProcura={(procura) => { setIsResponseModalOpen(false); setReopenAsNew(false); setProcuraBeingEdited(procura); setCurrentView('new_search_form'); }}
        companies={companies}
        currentUser={currentUser}
        myRatings={myRatings}
        onSubmitRating={onSubmitRating}
      />
    </div>
  );
};

export default UserDashboard;
