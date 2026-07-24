import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { registerPwa } from '@/lib/pwa';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import { logClientError } from '@/lib/errorTelemetry';

registerPwa();

// Cobertura para erros que não passam pelo AppErrorBoundary (que só pega
// erros de renderização do React): promises rejeitadas sem .catch e erros
// de script fora do ciclo de render.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  logClientError({
    message: reason?.message || String(reason || 'Rejeição de promise sem motivo'),
    componentStack: reason?.stack || null,
    source: 'unhandled_rejection',
  });
});

window.addEventListener('error', (event) => {
  if (!event?.message || event.message === 'Script error.') return;
  logClientError({
    message: event.message,
    componentStack: event.error?.stack || `${event.filename || ''}:${event.lineno || ''}:${event.colno || ''}`,
    source: 'window_error',
  });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
