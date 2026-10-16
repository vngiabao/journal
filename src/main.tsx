import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/600.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
// Installed on the Home Screen: cache the app for offline use, and ask the browser to keep this journal's data.
if(import.meta.env.PROD&&'serviceWorker' in navigator){import('virtual:pwa-register').then(({registerSW})=>registerSW({immediate:true})).catch(()=>{});}
navigator.storage?.persist?.().catch(()=>{});
