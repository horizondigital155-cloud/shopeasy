import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);

// ShopEasy PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => console.log('ShopEasy PWA ready:', registration.scope))
      .catch((error) => console.error('ShopEasy PWA registration failed:', error));
  });
}
