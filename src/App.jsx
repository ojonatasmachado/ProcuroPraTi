
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';
import UserDashboard from '@/components/UserDashboard';
import CompanyDashboard from '@/components/CompanyDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import UserRegistration from '@/components/UserRegistration'; 
import UserProfile from '@/components/UserProfile';
import CompanyMiniDashboard from '@/components/CompanyMiniDashboard.jsx';
import LandingPage from '@/components/LandingPage.jsx';
import TermsModal from '@/components/TermsModal.jsx';
import ChatModal from '@/components/ChatModal.jsx';
import FeedbackModal from '@/components/FeedbackModal.jsx';
import SuggestionPopup from '@/components/SuggestionPopup.jsx';
import AppHeader from '@/components/AppHeader.jsx';
import FirstProcuraInfoModal from '@/components/FirstProcuraInfoModal.jsx';
import ChatListModal from '@/components/ChatListModal.jsx';

import { 
  BRAZILIAN_STATES_AND_CITIES, 
  MOCK_VEHICLE_DATA, 
  generateInitialUsers,
  generateInitialCompanies,
  generateInitialProcuras,
  generateInitialChats,
  generateInitialFeedbacks
} from '@/lib/mockData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import dataService from '@/lib/dataService';
import { Settings, Building2, MessageSquare as ChatIconFab } from 'lucide-react';

const APP_VERSION = "procuroPraTi_v16_notification_fix";

function App() {
  const [users, setUsers] = useLocalStorage(`autoPartsUsers_${APP_VERSION}`, () => generateInitialUsers(150));
  const [companies, setCompanies] = useLocalStorage(`autoPartsCompanies_${APP_VERSION}`, () => generateInitialCompanies(50));
  const [procuras, setProcuras] = useLocalStorage(`autoPartsProcuras_${APP_VERSION}`, () => generateInitialProcuras(200, users || [], companies || []));
  const [chats, setChats] = useLocalStorage(`autoPartsChats_${APP_VERSION}`, () => generateInitialChats(users || [], companies || [], 100));
  const [feedbacks, setFeedbacks] = useLocalStorage(`autoPartsFeedbacks_${APP_VERSION}`, () => generateInitialFeedbacks(users || [], companies || [], 80));
  
  const [userType, setUserType] = useLocalStorage(`autoPartsUserType_${APP_VERSION}`, null);
  const [currentUser, setCurrentUser] = useLocalStorage(`autoPartsCurrentUser_${APP_VERSION}`, null);
  const [showLanding, setShowLanding] = useLocalStorage(`autoPartsShowLanding_${APP_VERSION}`, true);
  const [registrationIntent, setRegistrationIntent] = useState('user');

  const [showProfile, setShowProfile] = useState(false);
  const [showCompanyMiniDashboard, setShowCompanyMiniDashboard] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAcceptedDate, setTermsAcceptedDate] = useLocalStorage(`autoPartsTermsAcceptedDate_${currentUser?.id}_${APP_VERSION}`, null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatListModal, setShowChatListModal] = useState(false);
  const [activeChatTarget, setActiveChatTarget] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('rating'); 
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [appAccessCount, setAppAccessCount] = useLocalStorage(`autoPartsAccessCount_${currentUser?.id}_${APP_VERSION}`, 0);
  const [lastSuggestionDate, setLastSuggestionDate] = useLocalStorage(`autoPartsLastSuggestionDate_${currentUser?.id}_${APP_VERSION}`, null);
  const [userProcuraCount, setUserProcuraCount] = useLocalStorage(`userProcuraCount_${currentUser?.id}_${APP_VERSION}`, 0);
  const [showFirstProcuraInfo, setShowFirstProcuraInfo] = useState(false);

  const [unreadNotifications, setUnreadNotifications] = useState([]);

  const updateUnreadNotifications = useCallback(() => {
    if (!currentUser) {
      setUnreadNotifications([]);
      return;
    }

    const currentUsers = Array.isArray(users) ? users : [];
    const currentCompanies = Array.isArray(companies) ? companies : [];
    const currentProcuras = Array.isArray(procuras) ? procuras : [];
    const currentChats = typeof chats === 'object' && chats !== null ? chats : {};

    const notifications = [];
    if (userType === 'user') {
      currentProcuras.forEach(p => {
        if (p.userId === currentUser.id) {
          (p.responses || []).forEach(r => {
            if (r.status === 'available' && !r.isReadByUser) {
              notifications.push({
                id: `resp-${r.id}`, type: 'new_response',
                message: `Nova resposta de ${r.companyName} para "${p.partName}".`,
                procuraId: p.id, responseId: r.id,
                timestamp: new Date(r.responseDate).getTime(),
              });
            }
          });
        }
      });
    }

    Object.values(currentChats).flat().forEach(chat => {
      if (chat.receiverId === currentUser.id && !chat.isRead && chat.senderId !== currentUser.id) {
        const sender = currentUsers.find(u => u.id === chat.senderId) || currentCompanies.find(c => c.id === chat.senderId);
        notifications.push({
          id: `chat-${chat.id}`, type: 'new_chat_message',
          message: `Nova mensagem de ${sender?.name || 'Desconhecido'}.`,
          chatId: chat.chatId, senderId: chat.senderId,
          timestamp: new Date(chat.timestamp).getTime(),
        });
      }
    });

    notifications.sort((a, b) => b.timestamp - a.timestamp);
    setUnreadNotifications(notifications);
  }, [procuras, currentUser, userType, chats, users, companies]);

  useEffect(() => {
    updateUnreadNotifications();
  }, [updateUnreadNotifications]);

  // On mount, try to load from dataService (Supabase) and replace local state if available
  useEffect(() => {
    let mounted = true;
    async function loadRemote() {
      try {
        const [remoteUsers, remoteCompanies, remoteProcuras, remoteChats, remoteFeedbacks] = await Promise.all([
          dataService.getUsers(),
          dataService.getCompanies(),
          dataService.getProcuras(),
          dataService.getMessages(),
          dataService.getFeedbacks()
        ]);

        if (!mounted) return;
        if (Array.isArray(remoteUsers) && remoteUsers.length) setUsers(remoteUsers);
        if (Array.isArray(remoteCompanies) && remoteCompanies.length) setCompanies(remoteCompanies);
        if (Array.isArray(remoteProcuras) && remoteProcuras.length) setProcuras(remoteProcuras);
        if (remoteChats && Object.keys(remoteChats).length) setChats(remoteChats);
        if (Array.isArray(remoteFeedbacks) && remoteFeedbacks.length) setFeedbacks(remoteFeedbacks);
      } catch (err) {
        // silent: fallback to localStorage
        console.debug('dataService load skipped or failed:', err?.message || err);
      }
    }
    loadRemote();
    return () => { mounted = false; };
  }, [setUsers, setCompanies, setProcuras, setChats, setFeedbacks]);

  // Keep remote in sync when main collections change
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        await dataService.upsertUsers(Array.isArray(users) ? users : []);
      } catch (e) {
        if (!cancelled) console.debug('upsertUsers failed', e?.message || e);
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [users]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        await dataService.upsertCompanies(Array.isArray(companies) ? companies : []);
      } catch (e) {
        if (!cancelled) console.debug('upsertCompanies failed', e?.message || e);
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [companies]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        await dataService.upsertProcuras(Array.isArray(procuras) ? procuras : []);
      } catch (e) {
        if (!cancelled) console.debug('upsertProcuras failed', e?.message || e);
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [procuras]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        await dataService.upsertMessages(chats && typeof chats === 'object' ? chats : {});
      } catch (e) {
        if (!cancelled) console.debug('upsertMessages failed', e?.message || e);
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [chats]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        await dataService.upsertFeedbacks(Array.isArray(feedbacks) ? feedbacks : []);
      } catch (e) {
        if (!cancelled) console.debug('upsertFeedbacks failed', e?.message || e);
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [feedbacks]);

  useEffect(() => {
    if (currentUser && !termsAcceptedDate) {
      setShowTerms(true);
    }
  }, [currentUser, termsAcceptedDate]);

  useEffect(() => {
    if (currentUser) {
      const newCount = (appAccessCount || 0) + 1;
      setAppAccessCount(newCount);
      
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
      
      if (newCount === 3 || (newCount > 3 && (!lastSuggestionDate || new Date(lastSuggestionDate) < fortyDaysAgo))) {
        setShowSuggestionPopup(true);
      }
    }
  }, [currentUser, appAccessCount, setAppAccessCount, lastSuggestionDate, setShowSuggestionPopup]);

  const handleProcuraCreate = (newProcura) => {
    const procuraWithCountdown = {
      ...newProcura,
      userId: currentUser?.id,
      status: 'active',
      responses: [],
      duration: 1, 
      createdAt: new Date().toISOString()
    };
    
    setProcuras(prev => [procuraWithCountdown, ...(Array.isArray(prev) ? prev : [])]);
    toast({ 
      title: "Nova Procura Criada!", 
      description: "Enviamos sua solicitação para as empresas mais próximas. Aguarde até 24h úteis para resposta.",
      duration: 5000
    });
    
    const currentProcuraCount = (userProcuraCount || 0) + 1;
    setUserProcuraCount(currentProcuraCount);
    if (currentProcuraCount === 1) {
      setShowFirstProcuraInfo(true);
    }
  };

  const handleResponseSubmit = (procuraId, response) => {
    setProcuras(prevProcuras => 
      (Array.isArray(prevProcuras) ? prevProcuras : []).map(procura => {
        if (procura.id === procuraId) {
          const existingResponseIndex = (procura.responses || []).findIndex(r => r.companyId === currentUser?.id);
          let updatedResponses;
          if (existingResponseIndex > -1) {
            updatedResponses = [...(procura.responses || [])];
            updatedResponses[existingResponseIndex] = { 
              ...response, 
              companyId: currentUser?.id, 
              companyName: currentUser?.name, 
              cnpj: currentUser?.cnpj, 
              address: currentUser?.address, 
              isReadByUser: false, 
              isReadByCompany: true 
            };
          } else {
            updatedResponses = [...(procura.responses || []), { 
              ...response, 
              companyId: currentUser?.id, 
              companyName: currentUser?.name, 
              cnpj: currentUser?.cnpj, 
              address: currentUser?.address, 
              isReadByUser: false, 
              isReadByCompany: true 
            }];
          }
          return { ...procura, responses: updatedResponses };
        }
        return procura;
      })
    );
    toast({ title: "Resposta Enviada!", description: "O usuário será notificado sobre sua resposta." });
    updateUnreadNotifications();
  };
  
  const handleProcuraStatusChange = (procuraId, newStatus) => {
    setProcuras(prev => (Array.isArray(prev) ? prev : []).map(procura => 
      procura.id === procuraId ? { ...procura, status: newStatus } : procura
    ));
    updateUnreadNotifications();
  };

  const handleMarkResponseAsRead = (procuraId, responseId) => {
    setProcuras(prevProcuras => 
      (Array.isArray(prevProcuras) ? prevProcuras : []).map(procura => {
        if (procura.id === procuraId) {
          return {
            ...procura,
            responses: (procura.responses || []).map(r => 
              r.id === responseId ? { ...r, isReadByUser: true } : r
            )
          };
        }
        return procura;
      })
    );
    updateUnreadNotifications();
  };

  const handleUserRegister = (newUserData, type) => {
    const now = new Date().toISOString();
    const userData = { ...newUserData, id: Date.now().toString(), createdAt: now, termsAcceptedDate: now };
    if (type === 'user') {
      setUsers(prev => [...(Array.isArray(prev) ? prev : []), userData]);
    } else if (type === 'company') {
      setCompanies(prev => [...(Array.isArray(prev) ? prev : []), { 
        ...userData, 
        servesLocations: [newUserData.address.split(',').slice(-2).join(',').trim()], 
        paymentExemptUntil: null,
        validationStatus: 'pending', 
        validationReason: '',
        vehicleTypes: newUserData.vehicleTypes || ['car']
      }]);
    }
    setCurrentUser(userData);
    setUserType(type);
    setTermsAcceptedDate(now);
    setShowLanding(false);
    setShowTerms(false); 
  };

  const handleProfileUpdate = (updatedData) => {
    const finalData = { ...currentUser, ...updatedData };
    if (userType === 'company') {
      finalData.servesLocations = [finalData.address.split(',').slice(-2).join(',').trim()];
    }
    setCurrentUser(finalData);
    if (userType === 'user') {
      setUsers(prevUsers => (Array.isArray(prevUsers) ? prevUsers : []).map(u => u.id === currentUser.id ? finalData : u));
    } else if (userType === 'company') {
      setCompanies(prevCompanies => (Array.isArray(prevCompanies) ? prevCompanies : []).map(c => c.id === currentUser.id ? finalData : c));
    }
    setShowProfile(false);
  };

  const handleLogin = (email, password, type) => {
    let foundUser;
    const currentUsers = Array.isArray(users) ? users : [];
    const currentCompanies = Array.isArray(companies) ? companies : [];

    if (type === 'user') {
      foundUser = currentUsers.find(u => u.email === email && u.password === password);
    } else if (type === 'company') {
      foundUser = currentCompanies.find(c => c.email === email && c.password === password);
    } else if (type === 'admin') {
      if (email === 'admin@procuropra.ti' && password === 'admin123') {
        foundUser = { id: 'admin-master', name: 'Administrador Mestre', email: 'admin@procuropra.ti', createdAt: new Date().toISOString(), termsAcceptedDate: new Date().toISOString() };
      }
    }
    if (foundUser) {
      setCurrentUser(foundUser);
      setUserType(type);
      setShowLanding(false);
      setTermsAcceptedDate(foundUser.termsAcceptedDate || null); 
      if (!foundUser.termsAcceptedDate && type !== 'admin') { 
        setShowTerms(true);
      }
    } else {
       toast({ title: "Login Falhou", description: "Credenciais inválidas. Por favor, tente novamente.", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setUserType(null);
    setCurrentUser(null);
    setShowProfile(false);
    setShowCompanyMiniDashboard(false);
    setShowLanding(true);
    setTermsAcceptedDate(null);
    setUserProcuraCount(0);
    setAppAccessCount(0);
    setLastSuggestionDate(null);
  };

  const handleOpenChatWithUser = (userId) => {
    const currentUsers = Array.isArray(users) ? users : [];
    const currentCompanies = Array.isArray(companies) ? companies : [];
    const target = currentUsers.find(u => u.id === userId) || currentCompanies.find(c => c.id === userId);
    if (target) {
      setActiveChatTarget(target);
      setShowChatModal(true);
      setShowChatListModal(false);
    } else {
      toast({ title: "Erro", description: "Usuário não encontrado para iniciar o chat.", variant: "destructive"});
    }
  };

  const handleOpenChatList = () => {
    if (userType === 'company') {
      toast({ 
        title: "🚧 Funcionalidade Restrita", 
        description: "Apenas usuários podem iniciar conversas. Você pode responder quando alguém entrar em contato! 🚀",
        variant: "default",
        duration: 5000
      });
      return;
    }
    setShowChatListModal(true);
  };

  const handleSendMessage = (chatId, messageText) => {
    const newMessage = {
      id: Date.now().toString(),
      chatId: chatId,
      senderId: currentUser.id,
      receiverId: activeChatTarget.id,
      text: messageText,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setChats(prevChats => {
      const updatedChats = { ...(typeof prevChats === 'object' && prevChats !== null ? prevChats : {}) };
      if (!updatedChats[chatId]) {
        updatedChats[chatId] = [];
      }
      updatedChats[chatId] = [...updatedChats[chatId], newMessage];
      return updatedChats;
    });
    updateUnreadNotifications();
  };
  
  const handleMarkChatAsRead = (chatId, messageId) => {
    setChats(prevChats => {
      const currentChatMessages = (typeof prevChats === 'object' && prevChats !== null && Array.isArray(prevChats[chatId])) ? prevChats[chatId] : [];
      const updatedChatsForChatId = currentChatMessages.map(msg =>
        (msg.id === messageId && msg.receiverId === currentUser.id) ? { ...msg, isRead: true } : msg
      );
      return { ...(typeof prevChats === 'object' && prevChats !== null ? prevChats : {}), [chatId]: updatedChatsForChatId };
    });
    updateUnreadNotifications();
  };

  const handleFeedbackSubmit = (feedbackData) => {
    const newFeedback = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userType: userType,
      userName: currentUser.name,
      ...feedbackData,
      createdAt: new Date().toISOString(),
    };
    setFeedbacks(prev => [newFeedback, ...(Array.isArray(prev) ? prev : [])]);
    toast({ title: "Obrigado!", description: "Sua mensagem foi enviada com sucesso." });
    if (feedbackData.type === 'suggestion_popup') {
      setLastSuggestionDate(new Date().toISOString());
    }
    setShowFeedbackModal(false);
    setShowSuggestionPopup(false);
  };

  const openFeedbackModal = (type) => {
    setFeedbackType(type);
    setShowFeedbackModal(true);
  };

  const handleNotificationClick = (notification) => {
    const currentProcuras = Array.isArray(procuras) ? procuras : [];
    const currentUsers = Array.isArray(users) ? users : [];
    const currentCompanies = Array.isArray(companies) ? companies : [];

    if (notification.type === 'new_response') {
      const procura = currentProcuras.find(p => p.id === notification.procuraId);
      if (procura) {
        toast({ title: "Redirecionando...", description: `Vendo respostas para "${procura.partName}".` });
      }
    } else if (notification.type === 'new_chat_message') {
      const target = currentUsers.find(u => u.id === notification.senderId) || currentCompanies.find(c => c.id === notification.senderId);
      if (target) {
        handleOpenChatWithUser(target.id); 
      }
    }
    setUnreadNotifications(prev => (Array.isArray(prev) ? prev : []).filter(n => n.id !== notification.id));
  };

  const handleAcceptTerms = () => {
    const now = new Date().toISOString();
    setTermsAcceptedDate(now);
    if (currentUser) {
      setCurrentUser(prev => ({...prev, termsAcceptedDate: now}));
      if (userType === 'user') {
        setUsers(prevU => (Array.isArray(prevU) ? prevU : []).map(u => u.id === currentUser.id ? {...u, termsAcceptedDate: now} : u));
      } else if (userType === 'company') {
        setCompanies(prevC => (Array.isArray(prevC) ? prevC : []).map(c => c.id === currentUser.id ? {...c, termsAcceptedDate: now} : c));
      }
    }
    setShowTerms(false);
  };

  const handleSuggestionClose = (accepted) => {
    if (!accepted) {
      setLastSuggestionDate(new Date().toISOString()); 
    }
    setShowSuggestionPopup(false);
  };

  if (showLanding && !currentUser) {
    return (
      <LandingPage
        onGetStarted={(intent) => {
          setRegistrationIntent(intent === 'company' ? 'company' : 'user');
          setShowLanding(false);
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <UserRegistration
        onRegister={handleUserRegister}
        onLogin={handleLogin}
        allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
        initialUserType={registrationIntent}
      />
    );
  }

  if (showTerms && !termsAcceptedDate && userType !== 'admin') {
    return <TermsModal isOpen={showTerms} onClose={() => {}} onAccept={handleAcceptTerms} userType={userType} termsAcceptedDate={termsAcceptedDate} />;
  }

  if (showProfile) {
    return <UserProfile user={currentUser} userType={userType} onSave={handleProfileUpdate} onCancel={() => setShowProfile(false)} allStatesAndCities={BRAZILIAN_STATES_AND_CITIES} />;
  }

  if (showCompanyMiniDashboard && userType === 'company') {
    return <CompanyMiniDashboard 
              currentUser={currentUser}
              procuras={Array.isArray(procuras) ? procuras : []} 
              onClose={() => setShowCompanyMiniDashboard(false)} 
            />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontSize: userType !== 'admin' ? '16px' : 'inherit' }}>
      <AppHeader 
        currentUser={currentUser}
        userType={userType}
        unreadNotifications={unreadNotifications}
        onNotificationClick={handleNotificationClick}
        onShowProfile={() => setShowProfile(true)}
        onShowCompanyMiniDashboard={() => setShowCompanyMiniDashboard(true)}
        onShowTerms={() => setShowTerms(true)}
        onOpenFeedbackModal={openFeedbackModal}
        onOpenChatList={handleOpenChatList}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {userType === 'user' && (
          <UserDashboard 
            key={currentUser.id} 
            userProcuras={(Array.isArray(procuras) ? procuras : []).filter(s => s.userId === currentUser.id)}
            onProcuraCreate={handleProcuraCreate}
            onProcuraStatusChange={handleProcuraStatusChange}
            onMarkResponseAsRead={handleMarkResponseAsRead}
            currentUser={currentUser}
            allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
            vehicleData={MOCK_VEHICLE_DATA}
            onOpenChat={handleOpenChatWithUser}
            unreadNotifications={(Array.isArray(unreadNotifications) ? unreadNotifications : []).filter(n => n.type === 'new_response')}
          />
        )}
        {userType === 'company' && (
          <CompanyDashboard 
            key={currentUser.id}
            allProcuras={(Array.isArray(procuras) ? procuras : []).filter(p => 
              p.status === 'active' && 
              ((p.locations || []).length === 0 || (p.locations || []).some(loc => (currentUser.servesLocations || []).includes(loc.value))) &&
              (currentUser.vehicleTypes || ['car']).includes(p.vehicleType || 'car')
            )}
            companyResponses={(Array.isArray(procuras) ? procuras : []).reduce((acc, procura) => {
                const response = (procura.responses || []).find(r => r.companyId === currentUser.id);
                if (response) {
                    acc.push({ ...procura, myResponse: response });
                }
                return acc;
            }, [])}
            onResponseSubmit={handleResponseSubmit} 
            currentUser={currentUser}
            vehicleData={MOCK_VEHICLE_DATA}
            onOpenChat={handleOpenChatWithUser}
            users={Array.isArray(users) ? users : []}
          />
        )}
        {userType === 'admin' && (
          <AdminDashboard 
            procuras={Array.isArray(procuras) ? procuras : []} 
            users={Array.isArray(users) ? users : []} 
            companies={Array.isArray(companies) ? companies : []}
            setCompanies={setCompanies}
            feedbacks={Array.isArray(feedbacks) ? feedbacks : []}
            allStatesAndCities={BRAZILIAN_STATES_AND_CITIES} 
          />
        )}

        <div className="fixed top-20 right-2 sm:right-10 opacity-10 floating-animation -z-10">
          <Settings className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
        </div>
        <div className="fixed bottom-20 left-2 sm:left-10 opacity-10 floating-animation -z-10" style={{ animationDelay: '2s' }}>
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-accent" />
        </div>
      </main>
      
      {currentUser && userType !== 'admin' && (
        <button
          onClick={handleOpenChatList}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 p-3 sm:p-4 rounded-full gradient-bg text-primary-foreground shadow-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Abrir Chat"
        >
          <ChatIconFab className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      <TermsModal isOpen={showTerms && !!currentUser && userType !== 'admin'} onClose={() => termsAcceptedDate ? setShowTerms(false) : null} onAccept={handleAcceptTerms} userType={userType} termsAcceptedDate={termsAcceptedDate}/>
      
      {activeChatTarget && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => { setShowChatModal(false); setActiveChatTarget(null); }}
          currentUser={currentUser}
          targetUser={activeChatTarget}
          messages={((typeof chats === 'object' && chats !== null && Array.isArray(chats[`${Math.min(currentUser.id, activeChatTarget.id)}_${Math.max(currentUser.id, activeChatTarget.id)}`])) ? chats[`${Math.min(currentUser.id, activeChatTarget.id)}_${Math.max(currentUser.id, activeChatTarget.id)}`] : [])}
          onSendMessage={(messageText) => handleSendMessage(`${Math.min(currentUser.id, activeChatTarget.id)}_${Math.max(currentUser.id, activeChatTarget.id)}`, messageText)}
          onMarkAsRead={handleMarkChatAsRead}
        />
      )}

      <ChatListModal
        isOpen={showChatListModal}
        onClose={() => setShowChatListModal(false)}
        currentUser={currentUser}
        chats={typeof chats === 'object' && chats !== null ? chats : {}}
        users={Array.isArray(users) ? users : []}
        companies={Array.isArray(companies) ? companies : []}
        onOpenChat={handleOpenChatWithUser}
      />

      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
        onSubmit={handleFeedbackSubmit}
        feedbackType={feedbackType}
      />
      
      <SuggestionPopup
        isOpen={showSuggestionPopup}
        onClose={handleSuggestionClose}
        onSubmit={(suggestionText) => handleFeedbackSubmit({ type: 'suggestion_popup', text: suggestionText, rating: null })}
      />
      
      <FirstProcuraInfoModal
        isOpen={showFirstProcuraInfo}
        onClose={() => setShowFirstProcuraInfo(false)}
      />
      
      <Toaster />
    </div>
  );
}

export default App;
