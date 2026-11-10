import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, X } from 'lucide-react';
import App from './App.tsx';
import './index.css';

function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => console.error('PWA service worker:', error));
      });
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };
    const onInstalled = () => { setVisible(false); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);
  };

  if (!visible) return null;
  return <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-indigo-200 bg-white p-3 text-slate-900 shadow-2xl">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Download size={20} /></div>
    <div className="min-w-0 flex-1"><div className="text-sm font-bold">Okul Zili'ni telefona yükle</div><div className="text-xs text-slate-500">Ana ekrandan uygulama gibi aç.</div></div>
    <button onClick={install} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Yükle</button>
    <button onClick={() => setVisible(false)} aria-label="Kapat" className="p-1 text-slate-500"><X size={18} /></button>
  </div>;
}

createRoot(document.getElementById('root')!).render(<><App /><PWAInstallPrompt /></>);
