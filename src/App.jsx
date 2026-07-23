
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';
import UserDashboard from '@/components/UserDashboard';
import CompanyDashboard from '@/components/CompanyDashboard';
import UserRegistration from '@/components/UserRegistration'; 
import PasswordResetForm from '@/components/PasswordResetForm';
import UserProfile from '@/components/UserProfile';
import CompanyMiniDashboard from '@/components/CompanyMiniDashboard.jsx';
import LandingPage from '@/components/LandingPage.jsx';
import TermsModal from '@/components/TermsModal.jsx';
import ChatModal from '@/components/ChatModal.jsx';
import FeedbackModal from '@/components/FeedbackModal.jsx';
import SuggestionPopup from '@/components/SuggestionPopup.jsx';
import AppHeader from '@/components/AppHeader.jsx';
import FirstProcuraInfoModal from '@/components/FirstProcuraInfoModal.jsx';
import InstallOnboarding from '@/components/InstallOnboarding.jsx';
import ChatListModal from '@/components/ChatListModal.jsx';
import AdminDashboard from '@/components/AdminDashboard.jsx';
import BrandLogo from '@/components/BrandLogo.jsx';
import ThemeToggle from '@/components/ThemeToggle.jsx';
import { Button } from '@/components/ui/button';
import CompanyAccessGate from '@/components/CompanyAccessGate.jsx';
import CompanyTeamManagement from '@/components/CompanyTeamManagement.jsx';
import CompanyPlans from '@/components/CompanyPlans.jsx';
import { TrialEndModal, TrialWelcomeModal } from '@/components/CompanyTrialExperience.jsx';

import { 
  BRAZILIAN_STATES_AND_CITIES, 
  AUTOMOTIVE_REFERENCE_DATA
} from '@/lib/referenceData';
import dataService, { toCamel } from '@/lib/dataService';
import { createChatId, hasBuyerStartedConversation, normalizeChats } from '@/lib/chat';
import { getNextSuggestionDate, isSuggestionDue } from '@/lib/suggestionSchedule';
import { isSearchExpired, normalizeSearchDuration } from '@/lib/searchDuration';
import { disablePush, getPushState, syncExistingPushSubscription } from '@/lib/pushNotifications';
import { isStandalonePwa } from '@/lib/pwa';
import { clearPushDestinationFromUrl, getCurrentPushDestination } from '@/lib/pushNavigation';
import useScrollToTop from '@/hooks/useScrollToTop';
import { getCompanyDeviceId, getCompanyDeviceName } from '@/lib/companyAccess';
import { Settings, Building2, MessageSquare as ChatIconFab, Loader2 } from 'lucide-react';

const pushOnboardingKey = (userId) => `procuroPraTi_pushOnboarding_${userId}`;

function App() {
  const isAdminPreview = import.meta.env.DEV && window.location.pathname === '/painel-interno-preview';
  const isCollaboratorEntry = new URLSearchParams(window.location.search).get('colaborador') === '1';
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [procuras, setProcuras] = useState([]);
  const [chats, setChats] = useState({});
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => window.location.pathname === '/redefinir-senha');
  const [isAuthenticatedDataLoaded, setIsAuthenticatedDataLoaded] = useState(false);
  const [showLanding, setShowLanding] = useState(!isCollaboratorEntry);
  const [registrationIntent, setRegistrationIntent] = useState(isCollaboratorEntry ? 'company' : 'user');
  const [pendingPushDestination, setPendingPushDestination] = useState(() => getCurrentPushDestination());

  const [showProfile, setShowProfile] = useState(false);
  const [showCompanyMiniDashboard, setShowCompanyMiniDashboard] = useState(false);
  const [showCompanyTeam, setShowCompanyTeam] = useState(false);
  const [showCompanyPlans, setShowCompanyPlans] = useState(false);
  const [companyAccess, setCompanyAccess] = useState(null);
  const [subscriptionContext, setSubscriptionContext] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAcceptedDate, setTermsAcceptedDate] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatListModal, setShowChatListModal] = useState(false);
  const [activeChatTarget, setActiveChatTarget] = useState(null);
  const [activeChatProcuraId, setActiveChatProcuraId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('rating'); 
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [suggestionSchedule, setSuggestionSchedule] = useState({ userId: null, firstAccessAt: null, lastShownAt: null });
  const [userProcuraCount, setUserProcuraCount] = useState(0);
  const [showFirstProcuraInfo, setShowFirstProcuraInfo] = useState(false);
  const [adminPreviewData, setAdminPreviewData] = useState(null);
  const [adminPreviewError, setAdminPreviewError] = useState('');

  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const unreadChatCount = currentUser
    ? Object.values(chats || {}).flat().filter(message => message.receiverId === currentUser.id && !message.isRead).length
    : 0;

  const activeScreen = isAdminPreview
    ? 'admin-preview'
    : isAuthLoading
      ? 'auth-loading'
      : showLanding && !currentUser
        ? 'landing'
        : !currentUser
          ? `registration-${registrationIntent}`
          : userType === 'company' && companyAccess?.enabled && !companyAccess?.authorized
            ? `company-access-${currentUser.id}`
          : showTerms && !termsAcceptedDate
            ? `mandatory-terms-${currentUser.id}`
            : showProfile
              ? `profile-${currentUser.id}`
              : showCompanyMiniDashboard
                ? `company-metrics-${currentUser.id}`
              : showCompanyTeam
                  ? `company-team-${currentUser.id}`
                  : showCompanyPlans
                    ? `company-plans-${currentUser.id}`
                : `dashboard-${currentUser.id}`;
  useScrollToTop(activeScreen);

  useEffect(() => {
    const obsoletePrefixes = ['autoPartsUsers_', 'autoPartsCompanies_', 'autoPartsProcuras_', 'autoPartsChats_', 'autoPartsFeedbacks_', 'autoPartsCurrentUser_', 'autoPartsUserType_'];
    Object.keys(window.localStorage).forEach(key => {
      if (obsoletePrefixes.some(prefix => key.startsWith(prefix))) window.localStorage.removeItem(key);
    });
  }, []);

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
          procuraId: chat.procuraId || null,
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

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const onboardingState = window.localStorage.getItem(pushOnboardingKey(currentUser.id));
    const shouldPrompt = isStandalonePwa() || (userType === 'user' && onboardingState === 'pending');
    if (!shouldPrompt || onboardingState === 'completed') return undefined;

    let active = true;
    getPushState()
      .then((state) => {
        if (!active) return;
        if (state === 'enabled') {
          window.localStorage.setItem(pushOnboardingKey(currentUser.id), 'completed');
        } else {
          setShowFirstProcuraInfo(true);
        }
      })
      .catch(() => { if (active) setShowFirstProcuraInfo(true); });
    return () => { active = false; };
  }, [currentUser?.id, userType]);

  useEffect(() => {
    const normalized = normalizeChats(chats);
    if (JSON.stringify(normalized) !== JSON.stringify(chats)) {
      setChats(normalized);
    }
  }, [chats, setChats]);

  useEffect(() => {
    if (userType === 'admin') {
      setUserType(null);
      setCurrentUser(null);
      setShowLanding(true);
    }
  }, [userType, setUserType, setCurrentUser, setShowLanding]);

  const loadAuthenticatedData = useCallback(async () => {
    const [remoteUsers, remoteCompanies, remoteProcuras, remoteChats] = await Promise.all([
      dataService.getUsers(), dataService.getCompanies(), dataService.getProcuras(), dataService.getMessages(),
    ]);
    setUsers(remoteUsers);
    setCompanies(remoteCompanies);
    setProcuras(remoteProcuras);
    setChats(remoteChats);
    setIsAuthenticatedDataLoaded(true);
    return remoteProcuras;
  }, []);

  const hydrateSession = useCallback(async (session) => {
    if (!session?.user) {
      const pushDestination = getCurrentPushDestination();
      setCurrentUser(null);
      setUserType(null);
      setUsers([]);
      setCompanies([]);
      setProcuras([]);
      setChats({});
      setIsAuthenticatedDataLoaded(false);
      setTermsAcceptedDate(null);
      setShowTerms(false);
      setCompanyAccess(null);
      setSubscriptionContext(null);
      setShowCompanyTeam(false);
      setShowCompanyPlans(false);
      setPendingPushDestination(pushDestination);
      setShowLanding(!pushDestination && !isCollaboratorEntry);
      if (isCollaboratorEntry) setRegistrationIntent('company');
      if (pushDestination?.type === 'procuras') setRegistrationIntent('company');
      if (pushDestination?.type === 'respostas') setRegistrationIntent('user');
      setIsAuthLoading(false);
      return;
    }

    const preferredType = session.user.user_metadata?.account_type;
    setIsAuthenticatedDataLoaded(false);
    const account = await dataService.getCurrentProfile(session.user.id, preferredType);
    if (!account) throw new Error('O perfil desta conta não foi encontrado.');
    setCurrentUser(account.profile);
    setUserType(account.type);
    let accessContext = null;
    if (account.type === 'company') {
      [accessContext] = await Promise.all([
        dataService.getCompanyAccessContext(),
        dataService.getCompanySubscriptionContext()
          .then(context => {
            setSubscriptionContext(context);
            return context;
          })
          .catch(() => {
            setSubscriptionContext(null);
            return null;
          }),
      ]);
      setCompanyAccess(accessContext);
    } else {
      setCompanyAccess(null);
      setSubscriptionContext(null);
    }
    const acceptedTermsAt = account.profile.termsAcceptedDate || null;
    setTermsAcceptedDate(acceptedTermsAt);
    setShowLanding(false);
    if (account.type === 'company' && accessContext?.enabled && !accessContext?.authorized) {
      setUsers([]);
      setCompanies([]);
      setProcuras([]);
      setChats({});
      setShowTerms(false);
      setIsAuthenticatedDataLoaded(false);
      setIsAuthLoading(false);
      return;
    }
    setShowTerms(!acceptedTermsAt);
    if (account.type === 'company' && accessContext?.authorized) {
      void syncExistingPushSubscription(account.profile.id, 'company').catch(() => {});
    }
    const loadedProcuras = await loadAuthenticatedData();
    setUserProcuraCount(account.type === 'user' ? loadedProcuras.filter(item => item.userId === account.profile.id).length : 0);
    setIsAuthLoading(false);
  }, [isCollaboratorEntry, loadAuthenticatedData]);

  useEffect(() => {
    let active = true;
    dataService.resolveAuthCallback()
      .then(async ({ session, isCallback, hasVerificationToken, isPasswordRecovery: recoveryCallback }) => {
        if (!active) return;
        if (recoveryCallback) {
          setIsPasswordRecovery(true);
          setIsAuthLoading(false);
          return;
        }
        await hydrateSession(session);
        if (isCallback) {
          if (session && hasVerificationToken && window.location.pathname === '/confirmacao') {
            await dataService.confirmOwnEmail();
            await hydrateSession(session);
          }
          window.history.replaceState({}, '', '/');
          toast({
            title: 'Email confirmado',
            description: session ? 'Obrigado. A confirmação foi registrada.' : 'Abra o link mais recente enviado para seu email.',
          });
        }
      })
      .catch(error => {
        if (!active) return;
        setIsAuthLoading(false);
        const wasRecovery = window.location.pathname === '/redefinir-senha';
        if (window.location.pathname === '/confirmacao' || wasRecovery) window.history.replaceState({}, '', '/');
        if (wasRecovery) setIsPasswordRecovery(false);
        toast({ title: wasRecovery ? 'Link de recuperação inválido' : 'Não foi possível confirmar o email', description: error.message, variant: 'destructive' });
      });
    const { data: authListener } = dataService.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!active) return;
        if (window.location.pathname === '/redefinir-senha') {
          setIsPasswordRecovery(true);
          setIsAuthLoading(false);
          return;
        }
        hydrateSession(session).catch(error => toast({ title: 'Falha ao carregar a conta', description: error.message, variant: 'destructive' }));
      }, 0);
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [hydrateSession]);

  useEffect(() => {
    if (!currentUser || !isAuthenticatedDataLoaded) return undefined;
    let refreshTimer;
    let refreshing = false;

    const refreshData = async () => {
      if (refreshing || document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
        await loadAuthenticatedData();
        if (userType === 'company') {
          const context = await dataService.getCompanySubscriptionContext().catch(() => null);
          if (context) setSubscriptionContext(context);
        }
      } catch {
        // A conferência periódica tentará novamente sem interromper o uso do aplicativo.
      } finally {
        refreshing = false;
      }
    };

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refreshData, 500);
    };

    const unsubscribe = dataService.subscribeToDataChanges(scheduleRefresh);
    const fallbackTimer = window.setInterval(refreshData, 2 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      window.clearTimeout(refreshTimer);
      window.clearInterval(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isAuthenticatedDataLoaded, loadAuthenticatedData, userType]);

  useEffect(() => {
    if (userType !== 'company' || !companyAccess?.enabled || !companyAccess?.authorized) return undefined;
    let active = true;
    const heartbeat = async () => {
      try {
        const valid = await dataService.heartbeatCompanyAccess();
        if (!active || valid) return;
        const context = await dataService.getCompanyAccessContext();
        if (!active) return;
        setCompanyAccess(context);
        setIsAuthenticatedDataLoaded(false);
        setShowProfile(false);
        setShowCompanyMiniDashboard(false);
        setShowCompanyTeam(false);
      } catch {
        // A próxima verificação tentará novamente sem interromper uma operação em andamento.
      }
    };
    const timer = window.setInterval(heartbeat, 2 * 60 * 1000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void heartbeat(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [userType, companyAccess?.enabled, companyAccess?.authorized]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'CHAT_MESSAGE_RECEIVED' && currentUser) {
        void loadAuthenticatedData().catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, [currentUser, loadAuthenticatedData]);

  useEffect(() => {
    if (pendingPushDestination?.type !== 'procuras' || !currentUser || userType !== 'company') return undefined;
    const refreshDelays = [0, 1200, 3500];
    const timers = refreshDelays.map(delay => window.setTimeout(() => {
      void loadAuthenticatedData().catch(() => {});
    }, delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [pendingPushDestination?.type, pendingPushDestination?.procuraId, currentUser?.id, userType, loadAuthenticatedData]);

  useEffect(() => {
    if (currentUser && !termsAcceptedDate) {
      setShowTerms(true);
    }
  }, [currentUser, termsAcceptedDate]);

  useEffect(() => {
    if (!currentUser?.id) {
      setSuggestionSchedule({ userId: null, firstAccessAt: null, lastShownAt: null });
      return;
    }

    const firstAccessKey = `procuroPraTi_firstAccess_${currentUser.id}`;
    const lastShownKey = `procuroPraTi_lastSuggestionShown_${currentUser.id}`;
    const storedFirstAccess = window.localStorage.getItem(firstAccessKey);
    const firstAccessAt = storedFirstAccess ? JSON.parse(storedFirstAccess) : new Date().toISOString();
    if (!storedFirstAccess) window.localStorage.setItem(firstAccessKey, JSON.stringify(firstAccessAt));
    const storedLastShown = window.localStorage.getItem(lastShownKey);
    setSuggestionSchedule({
      userId: currentUser.id,
      firstAccessAt,
      lastShownAt: storedLastShown ? JSON.parse(storedLastShown) : null,
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || suggestionSchedule.userId !== currentUser.id || !suggestionSchedule.firstAccessAt) return undefined;

    const showSuggestion = () => {
      const shownAt = new Date().toISOString();
      window.localStorage.setItem(`procuroPraTi_lastSuggestionShown_${currentUser.id}`, JSON.stringify(shownAt));
      setSuggestionSchedule(prev => ({ ...prev, lastShownAt: shownAt }));
      setShowSuggestionPopup(true);
    };

    if (isSuggestionDue(suggestionSchedule)) {
      showSuggestion();
      return undefined;
    }

    const nextDate = getNextSuggestionDate(suggestionSchedule);
    const oneDay = 24 * 60 * 60 * 1000;
    const delay = Math.min(Math.max(nextDate.getTime() - Date.now(), 1000), oneDay);
    const timer = window.setTimeout(() => {
      if (isSuggestionDue(suggestionSchedule)) showSuggestion();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id, suggestionSchedule]);

  const handleProcuraCreate = async (newProcura) => {
    const procuraWithCountdown = {
      ...newProcura,
      id: crypto.randomUUID(),
      userId: currentUser?.id,
      status: 'active',
      responses: [],
      duration: normalizeSearchDuration(newProcura.duration),
      createdAt: new Date().toISOString()
    };
    
    try {
      const created = await dataService.createProcura(procuraWithCountdown);
      setProcuras(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
      const pushResult = await dataService.sendPushEvent('new_search', created.id).catch(() => null);
      const notifiedCompanies = Number(pushResult?.sent || 0);
      toast({
        title: "Nova procura criada",
        description: notifiedCompanies > 0
          ? `Sua procura já está disponível e ${notifiedCompanies} empresa(s) recebeu(ram) a notificação.`
          : "Sua procura já está disponível para as empresas compatíveis.",
        duration: 5000,
      });
    } catch (error) {
      toast({ title: "Não foi possível criar a procura", description: error.message, variant: "destructive" });
      return false;
    }
    
    const currentProcuraCount = (userProcuraCount || 0) + 1;
    setUserProcuraCount(currentProcuraCount);
    if (currentProcuraCount === 1) {
      window.localStorage.setItem(pushOnboardingKey(currentUser.id), 'pending');
      setShowFirstProcuraInfo(true);
    }
    return true;
  };

  const handleResponseSubmit = async (procuraId, response) => {
    const storedResponse = {
      ...response,
      id: response.id || crypto.randomUUID(),
      companyId: currentUser?.id,
      companyName: currentUser?.name,
      cnpj: currentUser?.cnpj,
      address: currentUser?.address,
      isReadByUser: false,
      isReadByCompany: true,
    };
    try {
      const savedResponse = await dataService.upsertResponse(procuraId, storedResponse);
      const pushResult = await dataService.sendPushEvent('response', savedResponse.id).catch(() => null);
    setProcuras(prevProcuras => 
      (Array.isArray(prevProcuras) ? prevProcuras : []).map(procura => {
        if (procura.id === procuraId) {
          const existingResponseIndex = (procura.responses || []).findIndex(r => r.companyId === currentUser?.id);
          let updatedResponses;
          if (existingResponseIndex > -1) {
            updatedResponses = [...(procura.responses || [])];
            updatedResponses[existingResponseIndex] = savedResponse;
          } else {
            updatedResponses = [...(procura.responses || []), savedResponse];
          }
          return { ...procura, responses: updatedResponses };
        }
        return procura;
      })
    );
    toast({ title: "Resposta Enviada!", description: Number(pushResult?.sent || 0) > 0 ? "O comprador recebeu uma notificação." : "A resposta já está disponível para o comprador." });
    updateUnreadNotifications();
      const refreshedSubscription = await dataService.getCompanySubscriptionContext().catch(() => null);
      if (refreshedSubscription) setSubscriptionContext(refreshedSubscription);
      return true;
    } catch (error) {
      toast({ title: "Não foi possível enviar a resposta", description: error.message, variant: "destructive" });
      return false;
    }
  };
  
  const handleProcuraStatusChange = async (procuraId, newStatus) => {
    const createdAt = newStatus === 'active' ? new Date().toISOString() : undefined;
    try {
      await dataService.updateProcuraStatus(procuraId, newStatus, createdAt);
    setProcuras(prev => (Array.isArray(prev) ? prev : []).map(procura => 
      procura.id === procuraId
        ? { ...procura, status: newStatus, ...(createdAt ? { createdAt } : {}) }
        : procura
    ));
    updateUnreadNotifications();
    return true;
    } catch (error) {
      toast({ title: "Não foi possível atualizar a procura", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const handleProcuraUpdate = async (procuraId, updates) => {
    try {
      const saved = await dataService.updateProcura(procuraId, updates);
      setProcuras(previous => previous.map(procura => procura.id === procuraId ? { ...procura, ...saved, responses: procura.responses || [] } : procura));
      toast({ title: 'Procura atualizada', description: 'As empresas verão as informações atualizadas.' });
      return true;
    } catch (error) {
      toast({ title: 'Não foi possível atualizar a procura', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    const finishExpiredSearches = () => {
      setProcuras(prev => {
        const current = Array.isArray(prev) ? prev : [];
        const hasExpired = current.some(procura => isSearchExpired(procura));
        if (!hasExpired) return prev;
        const expired = current.filter(procura => isSearchExpired(procura));
        expired.forEach(procura => dataService.updateProcuraStatus(procura.id, 'finished').catch(() => {}));
        return current.map(procura => isSearchExpired(procura) ? { ...procura, status: 'finished' } : procura);
      });
    };
    finishExpiredSearches();
    const timer = window.setInterval(finishExpiredSearches, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [setProcuras]);

  useEffect(() => {
    if (!isAdminPreview) return undefined;
    let active = true;
    fetch('/api/admin-preview-data')
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Falha ao carregar dados administrativos.');
        return payload;
      })
      .then(payload => {
        if (!active) return;
        setAdminPreviewData({
          users: (payload.users || []).map(toCamel),
          companies: (payload.companies || []).map(toCamel),
          procuras: (payload.procuras || []).map(toCamel),
          feedbacks: (payload.feedbacks || []).map(toCamel),
          registrationProgress: (payload.registrationProgress || []).map(toCamel),
        });
      })
      .catch(error => { if (active) setAdminPreviewError(error.message); });
    return () => { active = false; };
  }, [isAdminPreview]);

  const handleMarkResponseAsRead = async (procuraId, responseId) => {
    try {
      await dataService.markResponseRead(responseId);
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
    } catch (error) {
      toast({ title: "Não foi possível marcar a resposta", description: error.message, variant: "destructive" });
    }
  };

  const handleUserRegister = async (newUserData, type) => {
    try {
      const registrationData = type === 'company'
        ? { ...newUserData, servesLocations: [newUserData.address.split(',').slice(-2).join(',').trim()], vehicleTypes: newUserData.vehicleTypes || ['car'] }
        : newUserData;
      const result = await dataService.register(registrationData, type);
      if (!result.session) {
        toast({ title: "Confirme seu email", description: "Enviamos um link de confirmação para concluir o cadastro." });
        return { success: true, needsConfirmation: true };
      }
      await hydrateSession(result.session);
      toast({ title: 'Conta criada', description: 'Seu acesso está liberado. Enviaremos automaticamente o link de confirmação, o que pode levar até 1 minuto.' });
      void dataService.sendEmailVerification(newUserData.email, { retryOnRateLimit: true }).then(() => {
        toast({ title: 'E-mail de confirmação enviado', description: 'Abra o link recebido para registrar a confirmação. Você pode continuar usando o aplicativo.' });
      }).catch((error) => {
        toast({ title: 'Não foi possível enviar a confirmação', description: error.message, variant: 'destructive' });
      });
      setTermsAcceptedDate(null);
      setShowLanding(false);
      setShowTerms(true);
      return { success: true, needsConfirmation: false };
    } catch (error) {
      toast({ title: "Não foi possível criar a conta", description: error.message, variant: "destructive" });
      return { success: false, needsConfirmation: false };
    }
  };

  const handleRegistrationProgress = async (progress) => {
    await dataService.saveRegistrationProgress(progress);
  };

  const handleResendEmailVerification = async () => {
    try {
      await dataService.sendEmailVerification(currentUser.email);
      toast({ title: 'Email enviado', description: 'Abra o link para registrar a confirmação. Você pode continuar usando o aplicativo.' });
    } catch (error) {
      toast({ title: 'Não foi possível reenviar agora', description: error.message, variant: 'destructive' });
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    if (userType === 'company' && companyAccess?.role === 'operator') {
      toast({ title: 'Acesso do responsável', description: 'Somente o responsável pode editar o perfil da empresa.', variant: 'destructive' });
      return false;
    }
    const finalData = { ...currentUser, ...updatedData };
    if (userType === 'company') {
      finalData.servesLocations = [finalData.address.split(',').slice(-2).join(',').trim()];
    }
    try {
      const saved = await dataService.updateProfile(userType, currentUser.id, finalData);
      setCurrentUser(saved);
      if (userType === 'user') setUsers(prev => prev.map(user => user.id === saved.id ? { ...user, name: saved.name } : user));
      else setCompanies(prev => prev.map(company => company.id === saved.id ? { ...company, ...saved } : company));
      setShowProfile(false);
      toast({ title: "Perfil atualizado" });
      return true;
    } catch (error) {
      toast({ title: "Não foi possível atualizar o perfil", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const handleDeleteCompanyAccount = async () => {
    if (userType !== 'company' || !currentUser?.id) return false;
    if (companyAccess?.role === 'operator') {
      toast({ title: 'Acesso do responsável', description: 'Somente o responsável pode excluir a conta.', variant: 'destructive' });
      return false;
    }
    try {
      await dataService.deleteOwnCompanyAccount();
      setCurrentUser(null);
      setUserType(null);
      setUsers([]);
      setCompanies([]);
      setProcuras([]);
      setChats({});
      setIsAuthenticatedDataLoaded(false);
      setShowProfile(false);
      setShowCompanyMiniDashboard(false);
      setShowTerms(false);
      setTermsAcceptedDate(null);
      setShowLanding(true);
      toast({ title: 'Conta excluída', description: 'O cadastro foi encerrado. Um retorno futuro criará uma conta nova.' });
      return true;
    } catch (error) {
      toast({ title: 'Não foi possível excluir a conta', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleLogin = async (email, password, type) => {
    try {
      const result = await dataService.login(email, password);
      const actualType = result.user?.user_metadata?.account_type;
      if (actualType && actualType !== type) {
        await dataService.logout();
        toast({ title: "Tipo de conta diferente", description: `Este email está cadastrado como ${actualType === 'company' ? 'empresa' : 'comprador'}.`, variant: "destructive" });
        return false;
      }
      if (type === 'company') await dataService.recordCompanyAccess(result.user.id, new Date().toISOString());
      await hydrateSession(result.session);
      return { success: true, needsConfirmation: false };
    } catch (error) {
      const needsConfirmation = /email not confirmed/i.test(error.message || '');
      toast({
        title: needsConfirmation ? 'Confirme seu email' : 'Login não realizado',
        description: needsConfirmation ? 'Seu cadastro existe, mas o email ainda precisa ser confirmado.' : 'Confira o email e a senha e tente novamente.',
        variant: 'destructive',
      });
      return { success: false, needsConfirmation };
    }
  };

  const handleCollaboratorLogin = async ({ cnpj, username, pin }) => {
    try {
      const result = await dataService.loginCollaborator({
        cnpj,
        username,
        pin,
        deviceId: getCompanyDeviceId(),
        deviceName: getCompanyDeviceName(),
      });
      await hydrateSession(result.session);
      toast({ title: 'Acesso liberado', description: 'Você entrou com seu perfil individual de colaborador.' });
      return { success: true };
    } catch (error) {
      toast({ title: 'Não foi possível entrar', description: error.message, variant: 'destructive' });
      return { success: false, error: error.message };
    }
  };

  const handleResendConfirmation = async (email) => {
    try {
      await dataService.resendConfirmation(email);
      toast({ title: 'Novo email enviado', description: 'Use o link mais recente para confirmar sua conta.' });
      return true;
    } catch (error) {
      toast({ title: 'Não foi possível reenviar', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleRequestPasswordReset = async (email) => {
    try {
      await dataService.requestPasswordReset(email);
      toast({ title: 'Confira seu email', description: 'Enviamos as instruções para criar uma nova senha.' });
      return true;
    } catch (error) {
      toast({ title: 'Não foi possível enviar o email', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleCompletePasswordReset = async (password) => {
    try {
      await dataService.updatePassword(password);
      const session = await dataService.getSession();
      setIsPasswordRecovery(false);
      window.history.replaceState({}, '', '/');
      await hydrateSession(session);
      toast({ title: 'Senha atualizada', description: 'Sua nova senha já está valendo.' });
      return true;
    } catch (error) {
      toast({ title: 'Não foi possível alterar a senha', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleCancelPasswordReset = async () => {
    try { await dataService.logout(); } catch { /* A tela deve poder ser fechada mesmo se a sessão já expirou. */ }
    setIsPasswordRecovery(false);
    setCurrentUser(null);
    setUserType(null);
    setShowLanding(true);
    window.history.replaceState({}, '', '/');
  };

  const accountExists = (email) => dataService.getAccountType(email);
  const cnpjExists = (cnpj) => dataService.identifierExists('cnpj', cnpj);

  const handleLogout = async () => {
    if (userType === 'company' && companyAccess?.enabled) {
      try { await dataService.releaseCompanyAccess(); } catch { /* O logout continua mesmo se o acesso já expirou. */ }
    }
    try { await disablePush(); } catch { /* Logout must remain available if push cleanup fails. */ }
    try { await dataService.logout(); } catch (error) { toast({ title: "Não foi possível sair", description: error.message, variant: "destructive" }); }
    setUserType(null);
    setCurrentUser(null);
    setShowProfile(false);
    setShowCompanyMiniDashboard(false);
    setShowCompanyTeam(false);
    setShowCompanyPlans(false);
    setCompanyAccess(null);
    setSubscriptionContext(null);
    setShowLanding(true);
    setTermsAcceptedDate(null);
    setUserProcuraCount(0);
  };

  const handleClaimCompanyAccess = async ({ mode, username, pin }) => {
    await dataService.claimCompanyAccess({
      mode, username, pin,
      deviceId: getCompanyDeviceId(),
      deviceName: getCompanyDeviceName(),
    });
    const context = await dataService.getCompanyAccessContext();
    setCompanyAccess(context);
    void syncExistingPushSubscription(currentUser.id, 'company').catch(() => {});
    const loadedProcuras = await loadAuthenticatedData();
    setUserProcuraCount(0);
    setShowTerms(!termsAcceptedDate);
    if (loadedProcuras) toast({ title: `Olá, ${context.operatorName || 'responsável'}`, description: 'Seu acesso individual foi liberado.' });
  };

  const handleCompanyAccessEnabled = async () => {
    const context = await dataService.getCompanyAccessContext();
    setCompanyAccess(context);
  };

  const showAuthenticatedHome = () => {
    setShowProfile(false);
    setShowCompanyMiniDashboard(false);
    setShowCompanyTeam(false);
    setShowCompanyPlans(false);
  };

  const showAuthenticatedSection = (section) => {
    setShowProfile(section === 'profile');
    setShowCompanyMiniDashboard(section === 'performance');
    setShowCompanyTeam(section === 'team');
    setShowCompanyPlans(section === 'plans');
  };

  const handleOpenChatWithUser = useCallback((userId, procuraId = null) => {
    const currentUsers = Array.isArray(users) ? users : [];
    const currentCompanies = Array.isArray(companies) ? companies : [];
    const target = currentUsers.find(u => u.id === userId) || currentCompanies.find(c => c.id === userId);
    if (target) {
      if (!procuraId) {
        toast({ title: "Selecione uma procura", description: "Cada conversa pertence a uma procura específica." });
        return;
      }
      if (userType === 'company' && !hasBuyerStartedConversation(chats, currentUser.id, target.id, procuraId)) {
        toast({ title: "Conversa ainda não iniciada", description: "A empresa poderá responder pelo chat depois que o comprador enviar a primeira mensagem." });
        return;
      }
      setActiveChatProcuraId(procuraId);
      setActiveChatTarget(target);
      setShowChatModal(true);
      setShowChatListModal(false);
    } else {
      toast({ title: "Erro", description: "Usuário não encontrado para iniciar o chat.", variant: "destructive"});
    }
  }, [users, companies, userType, chats, currentUser]);

  const handlePushDestinationHandled = useCallback(() => {
    setPendingPushDestination(null);
    clearPushDestinationFromUrl();
  }, []);

  useEffect(() => {
    if (
      pendingPushDestination?.type !== 'mensagem'
      || !pendingPushDestination.userId
      || !currentUser
      || !termsAcceptedDate
      || showTerms
    ) return;

    const targetExists = [...(Array.isArray(users) ? users : []), ...(Array.isArray(companies) ? companies : [])]
      .some(person => person.id === pendingPushDestination.userId);
    if (!targetExists) return;

    handleOpenChatWithUser(pendingPushDestination.userId, pendingPushDestination.procuraId);
    handlePushDestinationHandled();
  }, [pendingPushDestination, currentUser, termsAcceptedDate, showTerms, users, companies, chats, handleOpenChatWithUser, handlePushDestinationHandled]);

  const handleOpenChatList = () => {
    setShowChatListModal(true);
  };

  const handleSendMessage = async (chatId, { text: messageText = '', imageFile = null }) => {
    if (!activeChatProcuraId) {
      toast({ title: "Conversa sem procura", description: "Abra a conversa a partir da procura correspondente." });
      return false;
    }
    if (userType === 'company' && !hasBuyerStartedConversation(chats, currentUser.id, activeChatTarget.id, activeChatProcuraId)) {
      toast({ title: "Envio não permitido", description: "Somente o comprador pode iniciar uma conversa." });
      return false;
    }
    let imagePath = '';
    try {
      if (imageFile) imagePath = await dataService.uploadChatImage(imageFile, currentUser.id);
      const newMessage = {
        id: crypto.randomUUID(),
        chatId,
        senderId: currentUser.id,
        receiverId: activeChatTarget.id,
        text: messageText,
        imagePath: imagePath || null,
        procuraId: activeChatProcuraId || null,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      const savedMessage = await dataService.createMessage(newMessage);
      void dataService.sendPushEvent('chat_message', savedMessage.id).catch(() => {});
      setChats(prevChats => {
      const updatedChats = { ...(typeof prevChats === 'object' && prevChats !== null ? prevChats : {}) };
      if (!updatedChats[chatId]) {
        updatedChats[chatId] = [];
      }
      updatedChats[chatId] = [...updatedChats[chatId], savedMessage];
      return updatedChats;
    });
    updateUnreadNotifications();
      return true;
    } catch (error) {
      if (imagePath) void dataService.removeChatImage(imagePath).catch(() => {});
      toast({ title: "Mensagem não enviada", description: error.message, variant: "destructive" });
      return false;
    }
  };
  
  const handleMarkChatAsRead = async (chatId, messageId) => {
    try {
      await dataService.markMessageRead(messageId);
    setChats(prevChats => {
      const currentChatMessages = (typeof prevChats === 'object' && prevChats !== null && Array.isArray(prevChats[chatId])) ? prevChats[chatId] : [];
      const updatedChatsForChatId = currentChatMessages.map(msg =>
        (msg.id === messageId && msg.receiverId === currentUser.id) ? { ...msg, isRead: true } : msg
      );
      return { ...(typeof prevChats === 'object' && prevChats !== null ? prevChats : {}), [chatId]: updatedChatsForChatId };
    });
    updateUnreadNotifications();
    } catch (error) {
      console.debug('markMessageRead failed', error?.message || error);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    const newFeedback = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userType: userType,
      userName: currentUser.name,
      ...feedbackData,
      contact: currentUser.email || currentUser.phone || null,
      createdAt: new Date().toISOString(),
    };
    try {
      await dataService.createFeedback(newFeedback);
      toast({ title: "Obrigado!", description: "Sua mensagem foi enviada com sucesso." });
      setShowFeedbackModal(false);
      setShowSuggestionPopup(false);
    } catch (error) {
      toast({ title: "Mensagem não enviada", description: error.message, variant: "destructive" });
    }
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
        setPendingPushDestination({ type: 'respostas', procuraId: procura.id, userId: null, messageId: null });
      }
    } else if (notification.type === 'new_chat_message') {
      const target = currentUsers.find(u => u.id === notification.senderId) || currentCompanies.find(c => c.id === notification.senderId);
      if (target) {
        handleOpenChatWithUser(target.id, notification.procuraId);
      }
    }
    setUnreadNotifications(prev => (Array.isArray(prev) ? prev : []).filter(n => n.id !== notification.id));
  };

  const handleAcceptTerms = async () => {
    const now = new Date().toISOString();
    try {
      const saved = await dataService.updateProfile(userType, currentUser.id, { termsAcceptedDate: now });
      setTermsAcceptedDate(now);
      setCurrentUser(saved);
      setShowTerms(false);
    } catch (error) {
      toast({ title: "Não foi possível registrar o aceite", description: error.message, variant: "destructive" });
    }
  };

  const handleSuggestionClose = () => {
    setShowSuggestionPopup(false);
  };

  if (isAdminPreview) {
    const previewUsers = adminPreviewData?.users || [];
    const previewCompanies = adminPreviewData?.companies || [];
    const previewProcuras = adminPreviewData?.procuras || [];
    const previewFeedbacks = adminPreviewData?.feedbacks || [];
    const previewRegistrationProgress = adminPreviewData?.registrationProgress || [];
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo as="h1" iconClassName="h-8 w-8" textClassName="text-base sm:text-xl" />
              <span className="hidden sm:inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Prévia local do admin</span>
              <span className="hidden md:inline-flex rounded-full border border-accent-agile/30 bg-accent-agile/10 px-2.5 py-1 text-xs font-medium text-accent-agile">Dados reais do Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button type="button" variant="outline" size="sm" onClick={() => { window.location.href = '/'; }}>Voltar ao site</Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
          {!adminPreviewData && !adminPreviewError && <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Carregando dados reais do Supabase...</div>}
          {adminPreviewError && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">Não foi possível carregar o painel: {adminPreviewError}</div>}
          {adminPreviewData && <AdminDashboard
            procuras={previewProcuras}
            users={previewUsers}
            companies={previewCompanies}
            setCompanies={(updater) => setAdminPreviewData(current => ({ ...current, companies: typeof updater === 'function' ? updater(current.companies) : updater }))}
            feedbacks={previewFeedbacks}
            registrationProgress={previewRegistrationProgress}
            allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
            readOnly
          />}
        </main>
        <Toaster />
      </div>
    );
  }

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando" /></div>;
  }

  if (isPasswordRecovery) {
    return <PasswordResetForm onSubmit={handleCompletePasswordReset} onCancel={handleCancelPasswordReset} />;
  }

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
            onSaveRegistrationProgress={handleRegistrationProgress}
        onLogin={handleLogin}
        onCollaboratorLogin={handleCollaboratorLogin}
        onResendConfirmation={handleResendConfirmation}
        onRequestPasswordReset={handleRequestPasswordReset}
        onBackToLanding={handleLogout}
        accountExists={accountExists}
        cnpjExists={cnpjExists}
        allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
        initialUserType={registrationIntent}
        initialCollaboratorMode={isCollaboratorEntry}
      />
    );
  }

  if (userType === 'company' && companyAccess?.enabled && !companyAccess?.authorized) {
    return <CompanyAccessGate company={currentUser} access={companyAccess} onClaim={handleClaimCompanyAccess} onLogout={handleLogout} />;
  }

  if (showTerms && !termsAcceptedDate) {
    return <TermsModal isOpen={showTerms} onClose={() => {}} onAccept={handleAcceptTerms} onReject={handleLogout} userType={userType} termsAcceptedDate={termsAcceptedDate} />;
  }

  const activeChatId = activeChatTarget && currentUser
    ? createChatId(currentUser.id, activeChatTarget.id, activeChatProcuraId)
    : null;
  const activeChatProcura = activeChatProcuraId
    ? (Array.isArray(procuras) ? procuras : []).find(procura => procura.id === activeChatProcuraId) || null
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontSize: '16px' }}>
      <AppHeader 
        currentUser={currentUser}
        userType={userType}
        unreadNotifications={unreadNotifications}
        onNotificationClick={handleNotificationClick}
        onShowHome={showAuthenticatedHome}
        onShowProfile={() => showAuthenticatedSection('profile')}
        onShowCompanyMiniDashboard={() => showAuthenticatedSection('performance')}
        onShowCompanyTeam={() => showAuthenticatedSection('team')}
        onShowCompanyPlans={() => showAuthenticatedSection('plans')}
        companyAccess={companyAccess}
        onShowTerms={() => setShowTerms(true)}
        onOpenFeedbackModal={openFeedbackModal}
        onOpenChatList={handleOpenChatList}
        onLogout={handleLogout}
      />

      {!currentUser.emailVerifiedAt && (
        <div className="border-b border-warning/30 bg-warning/10 px-3 py-2 text-foreground">
          <div className="container mx-auto flex flex-col items-start justify-between gap-2 text-sm sm:flex-row sm:items-center">
            <p><strong>Confirme seu email.</strong> Seu acesso já está liberado e a confirmação continua pendente.</p>
            <Button type="button" variant="outline" size="sm" onClick={handleResendEmailVerification} className="w-full border-warning/60 sm:w-auto">Reenviar email</Button>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {showProfile ? (
          <UserProfile
            user={currentUser}
            userType={userType}
            onSave={handleProfileUpdate}
            onDeleteAccount={handleDeleteCompanyAccount}
            onCancel={showAuthenticatedHome}
            allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
          />
        ) : showCompanyTeam && userType === 'company' && companyAccess?.role === 'owner' ? (
          <CompanyTeamManagement
            company={currentUser}
            access={companyAccess}
            onEnabled={handleCompanyAccessEnabled}
            onClose={showAuthenticatedHome}
          />
        ) : showCompanyPlans && userType === 'company' && companyAccess?.role !== 'operator' ? (
          <CompanyPlans
            currentPlanCode={subscriptionContext?.planCode}
            subscriptionState={subscriptionContext?.state}
          />
        ) : userType === 'user' ? (
          <UserDashboard 
            key={currentUser.id} 
            userProcuras={(Array.isArray(procuras) ? procuras : []).filter(s => s.userId === currentUser.id)}
            onProcuraCreate={handleProcuraCreate}
            onPhotoUpload={(file) => dataService.uploadSearchPhoto(file, currentUser.id)}
            onProcuraStatusChange={handleProcuraStatusChange}
            onProcuraUpdate={handleProcuraUpdate}
            onMarkResponseAsRead={handleMarkResponseAsRead}
            currentUser={currentUser}
            allStatesAndCities={BRAZILIAN_STATES_AND_CITIES}
            vehicleData={AUTOMOTIVE_REFERENCE_DATA}
            onOpenChat={handleOpenChatWithUser}
            unreadNotifications={(Array.isArray(unreadNotifications) ? unreadNotifications : []).filter(n => n.type === 'new_response')}
            companies={Array.isArray(companies) ? companies : []}
            openResponsesForProcuraId={pendingPushDestination?.type === 'respostas' ? pendingPushDestination.procuraId : null}
            onPushDestinationHandled={handlePushDestinationHandled}
          />
        ) : userType === 'company' ? (
          <CompanyDashboard 
            key={currentUser.id}
            allProcuras={(Array.isArray(procuras) ? procuras : []).filter(p => {
              if (p.status !== 'active' || isSearchExpired(p)) return false;
              const supportedVehicleTypes = currentUser.vehicleTypes?.length ? currentUser.vehicleTypes : ['car', 'motorcycle', 'truck', 'bus'];
              if (!supportedVehicleTypes.includes(p.vehicleType || 'car')) return false;
              return true;
            })}
            companyResponses={(Array.isArray(procuras) ? procuras : []).reduce((acc, procura) => {
                const response = (procura.responses || []).find(r => r.companyId === currentUser.id);
                if (response) {
                    acc.push({ ...procura, myResponse: response });
                }
                return acc;
            }, [])}
            onResponseSubmit={handleResponseSubmit} 
            onPhotoUpload={(file) => dataService.uploadPartPhoto(file, currentUser.id)}
            currentUser={currentUser}
            vehicleData={AUTOMOTIVE_REFERENCE_DATA}
            users={Array.isArray(users) ? users : []}
            openProcuraId={pendingPushDestination?.type === 'procuras' ? pendingPushDestination.procuraId : null}
            onPushDestinationHandled={handlePushDestinationHandled}
            isDataLoaded={isAuthenticatedDataLoaded}
            subscriptionContext={subscriptionContext}
            onShowPlans={() => setShowCompanyPlans(true)}
          />
        ) : null}
        <div className="fixed top-20 right-2 sm:right-10 opacity-10 floating-animation -z-10">
          <Settings className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
        </div>
        <div className="fixed bottom-20 left-2 sm:left-10 opacity-10 floating-animation -z-10" style={{ animationDelay: '2s' }}>
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-accent" />
        </div>
      </main>
      {showCompanyMiniDashboard && userType === 'company' && (
        <CompanyMiniDashboard
          currentUser={currentUser}
          procuras={Array.isArray(procuras) ? procuras : []}
          onClose={() => setShowCompanyMiniDashboard(false)}
        />
      )}
      {userType === 'company' && companyAccess?.role !== 'operator' && (
        <>
          <TrialWelcomeModal
            open={Boolean(subscriptionContext?.state === 'trial_active' && subscriptionContext?.welcomeSeen === false)}
            onContinue={async () => {
              await dataService.markTrialWelcomeSeen().catch(() => {});
              setSubscriptionContext(current => current ? { ...current, welcomeSeen: true } : current);
            }}
            onShowPlans={async () => {
              await dataService.markTrialWelcomeSeen().catch(() => {});
              setSubscriptionContext(current => current ? { ...current, welcomeSeen: true } : current);
              setShowCompanyPlans(true);
            }}
          />
          <TrialEndModal
            open={Boolean(subscriptionContext?.state === 'trial_ended' && subscriptionContext?.endSummarySeen === false)}
            context={subscriptionContext}
            onClose={async () => {
              await dataService.markTrialEndSummarySeen().catch(() => {});
              setSubscriptionContext(current => current ? { ...current, endSummarySeen: true } : current);
            }}
            onShowPlans={async () => {
              await dataService.markTrialEndSummarySeen().catch(() => {});
              setSubscriptionContext(current => current ? { ...current, endSummarySeen: true } : current);
              setShowCompanyPlans(true);
            }}
          />
        </>
      )}
      
      {currentUser && (
        <button
          onClick={handleOpenChatList}
          className="safe-floating-bottom fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50 p-3 sm:p-4 rounded-full gradient-bg text-primary-foreground ring-4 ring-background shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Abrir Chat"
        >
          <ChatIconFab className="h-5 w-5 sm:h-6 sm:w-6" />
          {unreadChatCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-accent-agile px-1 text-[10px] font-extrabold text-accent-agile-foreground">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
        </button>
      )}

      <TermsModal isOpen={showTerms && !!currentUser} onClose={() => termsAcceptedDate ? setShowTerms(false) : null} onAccept={handleAcceptTerms} onReject={handleLogout} userType={userType} termsAcceptedDate={termsAcceptedDate}/>
      
      {activeChatTarget && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => { setShowChatModal(false); setActiveChatTarget(null); setActiveChatProcuraId(null); }}
          currentUser={currentUser}
          targetUser={activeChatTarget}
          procura={activeChatProcura}
          messages={Array.isArray(chats?.[activeChatId]) ? chats[activeChatId] : []}
          onSendMessage={(message) => handleSendMessage(activeChatId, message)}
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
        procuras={Array.isArray(procuras) ? procuras : []}
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
        currentUser={currentUser}
        userType={userType}
        hasActiveSearch={userType === 'user' && userProcuraCount > 0}
        onComplete={() => {
          window.localStorage.setItem(pushOnboardingKey(currentUser.id), 'completed');
          setShowFirstProcuraInfo(false);
        }}
        onLater={() => {
          window.localStorage.setItem(pushOnboardingKey(currentUser.id), 'dismissed');
          setShowFirstProcuraInfo(false);
        }}
        onKeepPending={() => setShowFirstProcuraInfo(false)}
      />

      <InstallOnboarding isAuthenticated={Boolean(currentUser)} />
      
      <Toaster />
    </div>
  );
}

export default App;
