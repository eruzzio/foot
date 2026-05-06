import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/orion.css';
import './index.css';

// Activer le thème Orion sur le root
document.documentElement.setAttribute('data-theme', 'orion-dark');
document.documentElement.classList.add('orion');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
