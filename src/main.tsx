import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './styles/orion.css';
import './index.css';

document.documentElement.setAttribute('data-theme', 'orion-dark');
document.documentElement.classList.add('orion');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
// redeploy Thu May 21 09:31:55 UTC 2026
