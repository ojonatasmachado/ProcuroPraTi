
import React from 'react';
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
import { UserCircle, ChevronDown, BarChartHorizontalBig, FileText, Star, AlertOctagon, LogIn } from 'lucide-react';

const AutoPartsLogo = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

const AppHeader = ({ 
  currentUser, 
  userType, 
  unreadNotifications, 
  onNotificationClick,
  onShowProfile,
  onShowCdvMiniDashboard,
  onShowTerms,
  onOpenFeedbackModal,
  onLogout
}) => {
  const displayName = currentUser?.name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Usuário';
  return (
    <header className="py-3 px-4 shadow-md bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full gradient-bg">
            <AutoPartsLogo className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <h1 className={`text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ${(unreadNotifications?.length || 0) > 0 ? 'hidden xs:block' : 'block'}`}>
            Procuro Pra Ti
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
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
              <DropdownMenuLabel className="text-muted-foreground">{currentUser?.name || currentUser?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border"/>
              {userType !== 'admin' && (
                <DropdownMenuItem onClick={onShowProfile} className="cursor-pointer hover:!bg-accent/20">
                  <UserCircle className="mr-2 h-4 w-4 text-primary" />
                  <span>Editar Perfil</span>
                </DropdownMenuItem>
              )}
              {userType === 'cdv' && (
                 <DropdownMenuItem onClick={onShowCdvMiniDashboard} className="cursor-pointer hover:!bg-accent/20">
                  <BarChartHorizontalBig className="mr-2 h-4 w-4 text-primary" />
                  <span>Meu Desempenho</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onShowTerms} className="cursor-pointer hover:!bg-accent/20">
                <FileText className="mr-2 h-4 w-4 text-primary" />
                <span>Termos de Uso</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border"/>
              <DropdownMenuItem onClick={() => onOpenFeedbackModal('problem')} className="cursor-pointer hover:!bg-accent/20">
                <AlertOctagon className="mr-2 h-4 w-4 text-destructive" />
                <span>Relatar Problema</span>
              </DropdownMenuItem>
              {userType !== 'admin' && (
                <DropdownMenuItem onClick={() => onOpenFeedbackModal('rating')} className="cursor-pointer hover:!bg-accent/20">
                  <Star className="mr-2 h-4 w-4 text-yellow-500" />
                  <span>Avaliar Plataforma</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border"/>
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer hover:!bg-destructive/20 hover:!text-destructive">
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
