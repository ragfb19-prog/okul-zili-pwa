import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CalendarCheck,
  Volume2,
  VolumeX,
  Bell,
  RotateCcw,
  Sparkles,
  Send,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Calendar,
} from 'lucide-react';
import { WeekSchedule, DayName, RemoteAction } from './types';
import {
  createFreshWeek,
  DAYS_LIST,
  getTodayTurkishDay,
  OFFICIAL_TEMPLATE,
} from './utils/constants';
import { playSchoolBell } from './utils/audio';
import { LiveCountdownWidget } from './components/LiveCountdownWidget';
import { ScheduleList } from './components/ScheduleList';
import { PhoneWidgetMode } from './components/PhoneWidgetMode';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { initAuth } from './services/firebaseAuth';
import { User } from 'firebase/auth';

export default function App() {
  const [scheduleData, setScheduleData] = useState<WeekSchedule>(() => {
    try {
      const saved = localStorage.getItem('danisment_schedule_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return createFreshWeek();
  });

  const [currentDay, setCurrentDay] = useState<DayName>(() => {
    const today = getTodayTurkishDay();
    return today.isWeekend ? 'Pazartesi' : (today.day as DayName);
  });

  const [now, setNow] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWidgetModeOpen, setIsWidgetModeOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);

  // Google Workspace Auth State (In-Memory token caching)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Gemini Sesli & Yazılı Asistan State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [commandInput, setCommandInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string>('Henüz bir değişiklik yapılmadı.');
  const [lastActionTime, setLastActionTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevPeriodRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Çevrimiçi / çevrimdışı durumunu izle
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  // Otomatik Geri Sayım ve Saat Güncellemesi
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // URL'den `mode=widget` kontrolü
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'widget') {
      setIsWidgetModeOpen(true);
    }
  }, []);

  // localStorage Kaydet
  const saveSchedule = useCallback((updated: WeekSchedule) => {
    setScheduleData(updated);
    try {
      const serialized = JSON.stringify(updated);
      localStorage.setItem('danisment_schedule_data', serialized);
      // Native Android widget schedule bridge (available only inside the APK).
      (window as any).SchoolBellWidget?.updateSchedule?.(serialized);
    } catch (e) {
      console.warn('Veri kaydedilemedi:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Android ana ekran widget'ına ilk açılışta ve her program değişikliğinde veri aktar.
  useEffect(() => {
    try {
      (window as any).SchoolBellWidget?.updateSchedule?.(JSON.stringify(scheduleData));
    } catch (e) {
      console.warn('Android widget verisi gönderilemedi:', e);
    }
  }, [scheduleData]);

  // Komutu çizelgeye uygula
  const applyCommand = useCallback(
    (action: RemoteAction) => {
      const targetDay: DayName = action.day && DAYS_LIST.includes(action.day) ? action.day : currentDay;
      const lessonNum = Math.min(7, Math.max(1, Number(action.lessonNumber) || 1));

      setScheduleData((prev) => {
        const nextData = { ...prev };
        const daySlots = [...(nextData[targetDay] || OFFICIAL_TEMPLATE)];
        const lessons = daySlots.filter((s) => s.type === 'ders');
        const targetSlot = lessons[lessonNum - 1];

        if (targetSlot) {
          if (action.newTitle) targetSlot.title = action.newTitle;
          if (action.newNotes !== undefined) targetSlot.notes = action.newNotes;

          const updatedSlots = daySlots.map((s) => (s.id === targetSlot.id ? targetSlot : s));
          nextData[targetDay] = updatedSlots;
          saveSchedule(nextData);

          // Okul zilini çal
          playSchoolBell(soundEnabled);

          const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const desc = `${targetDay} ${lessonNum}. Ders ➔ ${targetSlot.title}${targetSlot.notes ? ` (${targetSlot.notes})` : ''}`;
          setLastAction(desc);
          setLastActionTime(timeStr);
          setCurrentDay(targetDay);
          showToast(`🔔 ${desc}`);
        }
        return nextData;
      });
    },
    [currentDay, saveSchedule, soundEnabled]
  );

  // Zil Zamanlayıcısı: Ders bittiğinde veya yeni ders başladığında zil çal
  useEffect(() => {
    const today = getTodayTurkishDay();
    if (today.isWeekend) return;

    const todaySlots = scheduleData[today.day as DayName] || scheduleData['Pazartesi'];
    const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentSec = now.getSeconds();

    if (currentSec !== 0) return;

    for (const slot of todaySlots) {
      if (slot.start === currentHM && prevPeriodRef.current !== `${slot.id}-start`) {
        prevPeriodRef.current = `${slot.id}-start`;
        playSchoolBell(soundEnabled);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🔔 Okul Zili Çaldı!', {
            body: `${slot.title} başladı (${slot.start} - ${slot.end})`,
          });
        }
        break;
      }
      if (slot.end === currentHM && prevPeriodRef.current !== `${slot.id}-end`) {
        prevPeriodRef.current = `${slot.id}-end`;
        playSchoolBell(soundEnabled);
        break;
      }
    }
  }, [now, scheduleData, soundEnabled]);

  const handleUpdateItem = (id: number, newTitle: string, newNotes: string) => {
    const updated = {
      ...scheduleData,
      [currentDay]: scheduleData[currentDay].map((item) =>
        item.id === id ? { ...item, title: newTitle, notes: newNotes } : item
      ),
    };
    saveSchedule(updated);
    showToast(`${currentDay} programı güncellendi.`);
  };

  const handleReset = () => {
    if (confirm('Tüm haftalık ders saatleri ve notlar varsayılan şablona sıfırlansın mı?')) {
      const fresh = createFreshWeek();
      saveSchedule(fresh);
      showToast('Program varsayılan şablona sıfırlandı.');
    }
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert('Bu tarayıcı bildirimleri desteklemiyor.');
      return;
    }
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        showToast('🔔 Zil bildirimleri başarıyla açıldı!');
      } else {
        alert('Bildirim izni verilmedi.');
      }
    });
  };

  // Gemini API komut işleyici
  const handleProcessTextCommand = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/gemini/parse-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: text.trim(),
          currentDay,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gemini komutu işleyemedi.');
      }

      applyCommand(data.action);
      setCommandInput('');
      setVoiceTranscript('');
    } catch (err: any) {
      alert(err.message || 'Komut işlenirken hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Tarayıcı İçi Ses Tanıma (Web Speech API)
  const toggleVoiceAssistant = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tarayıcınızda mikrofonla ses tanıma desteklenmiyor. Lütfen aşağıdaki kutuya yazarak komut verin.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('🔴 Dinleniyor... Konuşun!');
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setVoiceTranscript(`"${spoken}"`);
        setIsListening(false);
        handleProcessTextCommand(spoken);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceTranscript('Ses anlaşılamadı, lütfen tekrar deneyin.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mikrofon hatası:', err);
      setIsListening(false);
      alert('Mikrofona erişilemedi.');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(scheduleData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danisment-ders-programi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ders programı JSON dosyası olarak indirildi.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.Pazartesi && parsed.Salı) {
          saveSchedule(parsed);
          showToast('Program dosyadan başarıyla yüklendi!');
        } else {
          alert('Geçersiz dosya formatı.');
        }
      } catch {
        alert('Dosya okunamadı.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayObj = getTodayTurkishDay();
  const isToday = !todayObj.isWeekend && todayObj.day === currentDay;

  return (
    <div className="bg-slate-100 text-slate-800 min-h-screen flex flex-col font-sans">
      {/* Üst Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
                Program
              </h1>
              <span className="text-[11px] text-slate-500 font-medium">
                Canlı Okul Zili & Gemini Asistanı
              </span>
            </div>
          </div>

          {/* Aksiyonlar ve Canlı Saat */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-mono text-base font-bold text-slate-800">
                {now.toLocaleTimeString('tr-TR')}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium inline-flex items-center gap-1 justify-end">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{isOnline ? "Çevrimiçi" : "Çevrimdışı · Yerel program"}</span>
              </span>
            </div>

            {/* Google Takvim Butonu */}
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition ${
                googleUser
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{googleUser ? 'Google Takvim' : 'Takvim Bağla'}</span>
              {googleUser && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>

            {/* Widget Modu Butonu */}
            <button
              onClick={() => setIsWidgetModeOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95"
            >
              <Clock className="w-4 h-4" />
              <span>⏱️ Widget Modu</span>
            </button>

            {/* Sesli Asistan Mikrofon Butonu */}
            <button
              onClick={toggleVoiceAssistant}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
              <span className="hidden sm:inline">{isListening ? 'Dinleniyor...' : 'Sesli Komut'}</span>
            </button>

            {/* Zil Sesi Aç/Kapat */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSchoolBell(true);
              }}
              title={soundEnabled ? 'Zil Sesini Kapat' : 'Zil Sesini Aç'}
              className="p-2 text-indigo-600 hover:bg-slate-50 bg-slate-50 border border-slate-200 rounded-xl transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Zili Anında Test Et */}
            <button
              onClick={() => playSchoolBell(true)}
              title="Zili Çal"
              className="p-2 text-amber-600 hover:bg-amber-50 bg-amber-50/50 border border-amber-200 rounded-xl transition"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bildirim Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol/Orta Alan: Canlı Widget + Çizelge */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          {/* CANLI GERİ SAYIM SAYACI WİDGET'I */}
          <LiveCountdownWidget
            todaySlots={scheduleData[todayObj.isWeekend ? 'Pazartesi' : (todayObj.day as DayName)]}
            now={now}
            onPlayBell={() => playSchoolBell(true)}
          />

          {/* Gün Seçici Barı */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 flex justify-between gap-1 overflow-x-auto shadow-xs">
            {DAYS_LIST.map((day) => {
              const isSelected = currentDay === day;
              const isTodayDay = todayObj.day === day;
              return (
                <button
                  key={day}
                  onClick={() => setCurrentDay(day)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold transition relative ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{day}</span>
                  {isTodayDay && (
                    <span
                      className={`block text-[9px] font-normal ${
                        isSelected ? 'text-indigo-200' : 'text-indigo-600 font-bold'
                      }`}
                    >
                      (Bugün)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Araç Butonları */}
          <div className="flex flex-wrap items-center justify-between text-xs px-1 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs font-medium transition"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Takvim</span>
              </button>

              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs font-medium transition"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                <span>Zil Bildirimleri</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 shadow-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>

              <button
                onClick={handleExportJson}
                title="JSON Olarak Dışa Aktar"
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="JSON Dosyasından İçe Aktar"
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 shadow-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>

            <span className="text-slate-600 font-semibold text-xs">
              {currentDay} Programı (7 Ders + Öğle Arası)
            </span>
          </div>

          {/* Çizelge Listesi */}
          <ScheduleList
            items={scheduleData[currentDay] || []}
            isToday={isToday}
            currentHM={currentHM}
            onUpdateItem={handleUpdateItem}
          />
        </section>

        {/* Sağ Alan: Gemini Asistanı ve Bilgi Paneli */}
        <aside className="flex flex-col gap-4">
          {/* Gemini Akıllı Asistan Kartı */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-800/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">Gemini Akıllı Asistan</h2>
                  <p className="text-[11px] text-indigo-200/70">Sesli veya yazılı program yöneticisi</p>
                </div>
              </div>

              {/* Mikrofon Butonu */}
              <button
                onClick={toggleVoiceAssistant}
                className={`p-2.5 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-bounce ring-4 ring-rose-400/40'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Mikrofona basıp Türkçe konuşun"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
              </button>
            </div>

            {/* Ses Dinleme Durumu */}
            {voiceTranscript && (
              <div className="p-3 rounded-xl bg-white/10 border border-white/10 text-xs italic text-indigo-200">
                {voiceTranscript}
              </div>
            )}

            {/* Yazılı Komut Formu */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessTextCommand(commandInput);
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Örn: Salı 3. dersi Matematik yap..."
                  className="flex-1 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-xs text-white placeholder-indigo-200/50 outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={!commandInput.trim() || isProcessing}
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isProcessing ? '...' : 'Uygula'}</span>
                </button>
              </div>
            </form>

            {/* Hızlı Örnek Komutlar */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 block">
                Hızlı Komut Örnekleri:
              </span>
              <div className="flex flex-col gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleProcessTextCommand('Salı 3. ders Matematik')}
                  className="text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-100 transition border border-white/5"
                >
                  👉 Salı 3. ders Matematik
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessTextCommand('Çarşamba 1. derse ödev kontrolü notunu ekle')}
                  className="text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-100 transition border border-white/5"
                >
                  👉 Çarşamba 1. derse ödev kontrolü notunu ekle
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessTextCommand('Cuma 5. ders İngilizce, sınav var de')}
                  className="text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-100 transition border border-white/5"
                >
                  👉 Cuma 5. ders İngilizce, sınav var de
                </button>
              </div>
            </div>

            {/* Son İşlenen İşlem */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-indigo-300 font-bold mb-1">
                <span>Son Güncelleme:</span>
                {lastActionTime && <span>{lastActionTime}</span>}
              </div>
              <p className="text-xs italic text-white/90 break-words">
                {lastAction}
              </p>
            </div>
          </div>

          {/* Resmi Çizelge Bilgi Kartı */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs text-xs space-y-2.5">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Resmi Danişment Çizelgesi</span>
            </h3>
            <ul className="space-y-1.5 text-slate-600 text-[11px]">
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>Ders Süresi:</span>
                <strong className="font-semibold text-slate-800">40 Dakika</strong>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>Teneffüsler:</span>
                <strong className="font-semibold text-slate-800">10-15 Dakika</strong>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>Öğle Arası (12:05 - 12:55):</span>
                <strong className="font-semibold text-amber-700">50 Dakika</strong>
              </li>
              <li className="flex justify-between py-1">
                <span>Günlük Toplam:</span>
                <strong className="font-semibold text-indigo-600">7 Ders (08:40 - 15:15)</strong>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Telefon / Masa Saati Canlı Widget Modu */}
      {isWidgetModeOpen && (
        <PhoneWidgetMode
          todaySlots={scheduleData[todayObj.isWeekend ? 'Pazartesi' : (todayObj.day as DayName)]}
          now={now}
          currentDay={currentDay}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) playSchoolBell(true);
          }}
          onPlayBell={() => playSchoolBell(true)}
          onOpenRemote={() => {
            setIsWidgetModeOpen(false);
            toggleVoiceAssistant();
          }}
          onOpenFullSchedule={() => setIsWidgetModeOpen(false)}
          onCloseWidgetMode={() => setIsWidgetModeOpen(false)}
        />
      )}

      {/* Google Takvim Modalı */}
      <CalendarSyncModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        user={googleUser}
        accessToken={accessToken}
        onAuthSuccess={(u, t) => {
          setGoogleUser(u);
          setAccessToken(t);
        }}
        onLogout={() => {
          setGoogleUser(null);
          setAccessToken(null);
        }}
        scheduleData={scheduleData}
        onNotify={showToast}
      />
    </div>
  );
}
