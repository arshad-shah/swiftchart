import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CynosureProvider } from '@arshad-shah/cynosure-react';
import '@arshad-shah/cynosure-react/all.css';
import './app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CynosureProvider theme={{ defaultTheme: 'dark', enableSystem: true }}>
      <App />
    </CynosureProvider>
  </StrictMode>,
);
