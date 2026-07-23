import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { registerPwa } from '@/lib/pwa';
import AppErrorBoundary from '@/components/AppErrorBoundary';

registerPwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
