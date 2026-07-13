
import React, { useState, useMemo } from 'react';
import SearchForm from '@/components/SearchForm';
import SearchList from '@/components/SearchList';
import ResponseModal from '@/components/ResponseModal';
import { Users, History, PackageSearch, Bell, Edit2, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const UserDashboard = ({ userProcuras, onProcuraCreate, onProcuraStatusChange, onMarkResponseAsRead, currentUser, allStatesAndCities, vehicleData, onOpenChat, unreadNotifications }) => {
  const [selectedProcura, setSelectedProcura] = useState(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'new_search_form', 'active_searches', 'finished_searches'

  const handleViewResponses = (procura) => {
    setSelectedProcura(procura);
    setIsResponseModalOpen(true);
    // Mark notifications for this procura as read when responses are viewed
    const relatedNotifications = unreadNotifications.filter(n => n.procuraId === procura.id);
    relatedNotifications.forEach(n => onMarkResponseAsRead(n.procuraId, n.responseId));
  };

  const activeProcuras = useMemo(() => userProcuras.filter(s => s.status === 'active').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)), [userProcuras]);
  const finishedProcuras = useMemo(() => userProcuras.filter(s => s.status === 'finished').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)), [userProcuras]);

  const totalUnreadInActive = unreadNotifications.filter(n => activeProcuras.some(ap => ap.id === n.procuraId)).length;

  const markAsFinished = (procuraId) => {
    onProcuraStatusChange(procuraId, 'finished');
    toast({ title: "Procura finalizada!", description: "A procura foi movida para o histórico."});
  };
  
  const reopenProcura = (procuraId) => {
    onProcuraStatusChange(procuraId, 'active');
    toast({ title: "Procura reaberta!", description: "A procura foi movida para ativas."});
  };

  const handleCreateNewProcura = (newProcuraData) => {
    onProcuraCreate(newProcuraData);
    setCurrentView('active_searches'); 
  };

  const renderHomeView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="glass-effect hover:border-primary/50 transition-all">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center gap-2"><Edit2 size={20}/>Nova Procura</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Precisa de uma peça? Crie uma nova procura agora mesmo.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setCurrentView('new_search_form')} className="w-full gradient-bg">Criar Nova Procura</Button>
        </CardFooter>
      </Card>
      <Card className="glass-effect hover:border-primary/50 transition-all">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center gap-2"><Search size={20}/>Minhas Procuras</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Acompanhe suas procuras ativas e veja o histórico.</p>
          {totalUnreadInActive > 0 && (
            <p className="text-sm text-green-400 mt-1 flex items-center gap-1"><Bell size={14}/> Você tem {totalUnreadInActive} nova(s) resposta(s)!</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => setCurrentView('active_searches')} variant="outline" className="w-full">Ver Minhas Procuras</Button>
        </CardFooter>
      </Card>
    </div>
  );

  const renderSearchFormView = () => (
     <SearchForm 
        onProcuraCreate={handleCreateNewProcura} 
        currentUser={currentUser} 
        allStatesAndCities={allStatesAndCities}
        vehicleData={vehicleData}
        onGoBack={() => setCurrentView('home')}
      />
  );

  const renderSearchesView = () => (
    <>
      <Button onClick={() => setCurrentView('home')} variant="outline" className="mb-4"><ArrowLeft className="h-4 w-4 mr-2"/> Voltar para Home</Button>
      <Tabs defaultValue="active" value={currentView === 'finished_searches' ? 'finished' : 'active'} 
            onValueChange={(tab) => setCurrentView(tab === 'active' ? 'active_searches' : 'finished_searches')} 
            className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-input/70 border border-border">
          <TabsTrigger 
            value="active" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary relative"
          >
            <PackageSearch className="h-3 w-3 sm:h-4 sm:w-4" />
            Procuras Ativas ({activeProcuras.length})
            {totalUnreadInActive > 0 && (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                {totalUnreadInActive}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="finished" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500"
          >
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            Procuras Finalizadas ({finishedProcuras.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <SearchList procuras={activeProcuras} onViewResponses={handleViewResponses} onMarkAsFinished={markAsFinished} listType="active" unreadNotifications={unreadNotifications} />
          </motion.div>
        </TabsContent>
        
        <TabsContent value="finished">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <SearchList procuras={finishedProcuras} onViewResponses={handleViewResponses} onReopenSearch={reopenProcura} listType="finished" unreadNotifications={[]} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </>
  );


  return (
    <div className="space-y-6 sm:space-y-10" id="user-dashboard-tabs">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <Users className="h-7 w-7 sm:h-8 sm:w-8" />
          Painel do Usuário
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">Crie suas procuras de peças e acompanhe as respostas.</p>
      </motion.div>

      {currentView === 'home' && renderHomeView()}
      {currentView === 'new_search_form' && renderSearchFormView()}
      {(currentView === 'active_searches' || currentView === 'finished_searches') && renderSearchesView()}

      <ResponseModal
        procura={selectedProcura}
        isOpen={isResponseModalOpen}
        onClose={() => {
          setIsResponseModalOpen(false);
          setSelectedProcura(null);
        }}
        onMarkAsRead={onMarkResponseAsRead}
        onOpenChat={onOpenChat}
      />
    </div>
  );
};

export default UserDashboard;
