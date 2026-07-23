
import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import NotificationDropdown from '@/components/NotificationDropdown.jsx';
import { UserCircle, ChevronDown, BarChartHorizontalBig, FileText, Star, AlertOctagon, LogIn, BellRing, BellOff, Users, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import { disablePush, enablePush, getPushState, getPushSupport, PUSH_STATE_CHANGE_EVENT } from '@/lib/pushNotifications';
import { toast } from '@/components/ui/use-toast';

const AppHeader = ({
  currentUser, 
  userType, 
  unreadNotifications, 
  onNotificationClick,
  onShowProfile,
  onShowCompanyMiniDashboard,
  onShowCompanyTeam,
  onShowCompanyPlans,
  companyAccess,
  onShowTerms,
  onOpenFeedbackModal,
  onLogout
}) => {
  const displayName = companyAccess?.operatorName || currentUser?.name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Usuário';
  const isCompanyOperator = userType === 'company' && companyAccess?.role === 'operator';
  const [pushState, setPushState] = useState('loading');
  const [pushSupportReason, setPushSupportReason] = useState(null);

  useEffect(() => {
    let active = true;
    const handlePushStateChange = (event) => setPushState(event.detail);
    setPushSupportReason(getPushSupport().reason);
    getPushState().then((state) => { if (active) setPushState(state); }).catch(() => { if (active) setPushState('unsupported'); });
    window.addEventListener(PUSH_STATE_CHANGE_EVENT, handlePushStateChange);
    return () => {
      active = false;
      window.removeEventListener(PUSH_STATE_CHANGE_EVENT, handlePushStateChange);
    };
  }, [currentUser?.id]);

  const togglePush = async () => {
    try {
      const nextState = pushState === 'enabled'
        ? await disablePush()
        : await enablePush(currentUser.id, userType);
      setPushState(nextState);
      toast({ title: nextState === 'enabled' ? 'Notificações ativadas' : 'Notificações desativadas', description: nextState === 'enabled' ? 'Você poderá receber respostas e mensagens mesmo com o app fechado.' : 'Este dispositivo não receberá mais notificações push.' });
    } catch (error) {
      setPushState(await getPushState().catch(() => 'unsupported'));
      toast({ title: 'Não foi possível alterar as notificações', description: error.message, variant: 'destructive' });
    }
  };
  return (
    <header className="safe-header py-3 px-3 sm:px-4 shadow-md bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex min-w-0 justify-between items-center gap-2">
        <BrandLogo as="h1" compactOnMobile iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-lg sm:text-2xl" className="min-w-0" />
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <ThemeToggle />
          <NotificationDropdown 
            notifications={unreadNotifications} 
            onNotificationClick={onNotificationClick}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary">
                <UserCircle className="h-5 w-5" />
                <span className="hidden sm:inline">{displayName}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-56">
              <DropdownMenuLabel className="text-muted-foreground">{companyAccess?.operatorName ? `${companyAccess.operatorName} · ${currentUser?.name}` : currentUser?.name || currentUser?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border"/>
              {userType !== 'admin' && !isCompanyOperator && (
                <DropdownMenuItem onClick={onShowProfile} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                  <UserCircle className="mr-2 h-4 w-4 text-primary" />
                  <span>Editar Perfil</span>
                </DropdownMenuItem>
              )}
              {userType === 'company' && (
                 <DropdownMenuItem onClick={onShowCompanyMiniDashboard} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                  <BarChartHorizontalBig className="mr-2 h-4 w-4 text-primary" />
                  <span>Meu Desempenho</span>
                </DropdownMenuItem>
              )}
              {userType === 'company' && !isCompanyOperator && (
                <DropdownMenuItem onClick={onShowCompanyPlans} className="cursor-pointer font-semibold focus:!bg-primary/15 focus:!text-foreground">
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  <span>Planos e assinatura</span>
                </DropdownMenuItem>
              )}
              {userType === 'company' && !isCompanyOperator && (
                <DropdownMenuItem onClick={onShowCompanyTeam} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <span>Equipe e Acessos</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onShowTerms} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                <FileText className="mr-2 h-4 w-4 text-primary" />
                <span>Termos de Uso</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border"/>
              {userType !== 'admin' && (
                <>
                  <DropdownMenuItem onClick={togglePush} disabled={pushState === 'loading' || pushState === 'unsupported' || pushState === 'denied'} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                    {pushState === 'enabled' ? <BellOff className="mr-2 h-4 w-4 text-muted-foreground" /> : <BellRing className="mr-2 h-4 w-4 text-primary" />}
                    <span>{pushState === 'enabled' ? 'Desativar notificações' : pushState === 'denied' ? 'Notificações bloqueadas' : pushState === 'unsupported' ? pushSupportReason === 'ios-version' ? 'Atualize o iPhone' : 'Push indisponível' : 'Ativar notificações'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border"/>
                </>
              )}
              <DropdownMenuItem onClick={() => onOpenFeedbackModal('problem')} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                <AlertOctagon className="mr-2 h-4 w-4 text-danger" />
                <span>Relatar Problema</span>
              </DropdownMenuItem>
              {userType !== 'admin' && (
                <DropdownMenuItem onClick={() => onOpenFeedbackModal('rating')} className="cursor-pointer focus:!bg-primary/15 focus:!text-foreground">
                  <Star className="mr-2 h-4 w-4 text-warning" />
                  <span>Avaliar Plataforma</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border"/>
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer hover:!bg-destructive/20 hover:!text-danger">
                <LogIn className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
