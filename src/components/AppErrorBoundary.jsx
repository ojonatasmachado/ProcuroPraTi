import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { refreshPwaApplication } from '@/lib/pwa';
import { supabase } from '@/lib/supabaseClient';

const UI_RECOVERY_KEY = 'procuroPraTi_uiRecoveryAttempt';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isRefreshing: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Falha de interface recuperável', error);
    try {
      window.sessionStorage.setItem('procuroPraTi_lastUiError', JSON.stringify({
        message: error?.message || String(error),
        componentStack: errorInfo?.componentStack || '',
        occurredAt: new Date().toISOString(),
      }));
    } catch {
      // O registro local é apenas auxiliar e não deve impedir a recuperação.
    }
    void supabase?.rpc('log_ui_error', {
      p_message: error?.stack || error?.message || String(error),
      p_component_stack: errorInfo?.componentStack || null,
      p_page_path: window.location.href,
      p_user_agent: navigator.userAgent,
      p_app_version: document.querySelector('script[type="module"][src]')?.getAttribute('src') || 'desconhecida',
    }).catch(() => {});

    const message = `${error?.message || ''} ${error?.stack || ''}`;
    const looksLikeStaleApplication = /chunk|dynamically imported|failed to fetch|loading css|module script/i.test(message);
    if (looksLikeStaleApplication && window.sessionStorage.getItem(UI_RECOVERY_KEY) !== 'done') {
      window.sessionStorage.setItem(UI_RECOVERY_KEY, 'done');
      void refreshPwaApplication();
    }
  }

  handleRefresh = async () => {
    if (this.state.isRefreshing) return;
    this.setState({ isRefreshing: true });
    await refreshPwaApplication();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardContent className="space-y-4 p-6 text-center">
            <BrandLogo as="h1" className="justify-center" iconClassName="h-10 w-10" textClassName="text-xl" />
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15"><AlertTriangle className="h-6 w-6 text-warning" /></span>
            <div><h2 className="text-lg font-bold">Não foi possível abrir esta tela</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Seus dados estão seguros. Atualize o aplicativo para carregar novamente.</p></div>
            <Button type="button" onClick={this.handleRefresh} disabled={this.state.isRefreshing} className="min-h-11 w-full"><RefreshCw className={`mr-2 h-4 w-4 ${this.state.isRefreshing ? 'animate-spin' : ''}`} />{this.state.isRefreshing ? 'Buscando atualização' : 'Atualizar aplicativo'}</Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}

export default AppErrorBoundary;
