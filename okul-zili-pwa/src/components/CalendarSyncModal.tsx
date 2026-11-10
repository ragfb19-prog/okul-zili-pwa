import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { WeekSchedule } from '../types';
import {
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  CalendarEvent,
  fetchCalendarEvents,
  deleteCalendarEvent,
  createCalendarEvent,
  syncScheduleToGoogleCalendar,
  getWeekdayDate,
} from '../services/calendarService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  scheduleData: WeekSchedule;
  onNotify: (msg: string) => void;
}

export const CalendarSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onAuthSuccess,
  onLogout,
  scheduleData,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'events'>('sync');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; item: string } | null>(null);

  // Destructive deletion confirmation state
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Sync confirmation modal state
  const [showSyncConfirm, setShowSyncConfirm] = useState<boolean>(false);

  // Manual event creation form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newSummary, setNewSummary] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newStartTime, setNewStartTime] = useState<string>('10:00');
  const [newEndTime, setNewEndTime] = useState<string>('11:00');

  useEffect(() => {
    if (isOpen && accessToken) {
      loadCalendarEvents();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const loadCalendarEvents = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const oneWeekLater = new Date(now);
      oneWeekLater.setDate(now.getDate() + 14);

      const items = await fetchCalendarEvents(
        accessToken,
        now.toISOString(),
        oneWeekLater.toISOString()
      );
      setEvents(items);
    } catch (err: any) {
      console.error('Takvim etkinlikleri yüklenemedi:', err);
      onNotify(`Hata: ${err.message || 'Etkinlikler alınamadı'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        onNotify('Google Takvim başarıyla bağlandı!');
      }
    } catch (err: any) {
      console.error('Giriş başarısız:', err);
      alert(err.message || 'Google ile giriş yapılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onLogout();
    setEvents([]);
    onNotify('Google oturumu kapatıldı.');
  };

  const executeSync = async () => {
    if (!accessToken) return;
    setShowSyncConfirm(false);
    setIsLoading(true);
    setSyncProgress({ current: 0, total: 35, item: 'Hazırlanıyor...' });

    try {
      const result = await syncScheduleToGoogleCalendar(
        accessToken,
        scheduleData,
        (current, total, item) => {
          setSyncProgress({ current, total, item });
        }
      );
      onNotify(`✅ ${result.createdCount} ders periyodu Google Takviminize aktarıldı!`);
      await loadCalendarEvents();
      setActiveTab('events');
    } catch (err: any) {
      console.error('Senkronizasyon hatası:', err);
      alert(`Senkronizasyon sırasında hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
      setSyncProgress(null);
    }
  };

  const executeDeleteEvent = async () => {
    if (!eventToDelete || !accessToken) return;
    const target = eventToDelete;
    setEventToDelete(null);
    setIsLoading(true);

    try {
      await deleteCalendarEvent(accessToken, target.id);
      setEvents((prev) => prev.filter((e) => e.id !== target.id));
      onNotify(`🗑️ "${target.summary}" etkinliği Google Takvimden silindi.`);
    } catch (err: any) {
      alert(`Etkinlik silinemedi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newSummary.trim()) return;

    setIsLoading(true);
    try {
      const startDateTime = `${newDate}T${newStartTime}:00`;
      const endDateTime = `${newDate}T${newEndTime}:00`;

      await createCalendarEvent(accessToken, {
        summary: newSummary.trim(),
        description: 'Danişment Okul Hatırlatıcısı',
        startDateTime,
        endDateTime,
      });

      onNotify(`✅ "${newSummary}" takvime eklendi!`);
      setNewSummary('');
      setShowAddForm(false);
      await loadCalendarEvents();
    } catch (err: any) {
      alert(`Etkinlik eklenemedi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                <span>Google Takvim Entegrasyonu</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Ders saatlerini ve notlarını doğrudan Google Takviminle senkronize et
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kullanıcı Giriş Durumu */}
        {!user || !accessToken ? (
          <div className="py-6 text-center space-y-5">
            <div className="max-w-xs mx-auto space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Haftalık 7 derslik Danişment çizelgenizi ve sınav/ödev hatırlatıcılarınızı Google Takviminize aktarmak için hesabınızla giriş yapın.
              </p>
            </div>

            {/* Resmi Sign in with Google Butonu */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 shadow-xs transition font-medium text-xs text-slate-700 active:scale-95 disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Google ile Giriş Yap</span>
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed text-left">
              🔒 İzninizle yalnızca Google Takvim etkinliklerinize erişilir ve ders çizelgeniz takviminize kaydedilir.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bağlı Kullanıcı Kartı */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Kullanıcı'}
                    className="w-9 h-9 rounded-full object-cover border border-slate-300"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-xs text-slate-800 leading-tight">
                    {user.displayName || 'Google Kullanıcısı'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                title="Oturumu Kapat"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Sekmeler */}
            <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('sync')}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  activeTab === 'sync'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Takvime Aktar
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  activeTab === 'events'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Etkinliklerim ({events.length})
              </button>
            </div>

            {/* TAB 1: SENKRONİZASYON */}
            {activeTab === 'sync' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 space-y-2">
                  <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Haftalık Okul Çizelgesini Aktar</span>
                  </h4>
                  <p className="text-xs text-blue-800/80 leading-relaxed">
                    Pazartesi&apos;den Cuma&apos;ya tüm 7 ders periyodunuz (toplam 35 ders saati) Google Takviminize otomatik olarak ilgili saat dilimlerinde (08:40 - 15:15) etkinlik olarak işlenecektir.
                  </p>
                </div>

                {/* İlerleme Çubuğu */}
                {syncProgress && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 animate-in fade-in">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-blue-300">{syncProgress.item}</span>
                      <span className="font-mono text-slate-300">
                        {syncProgress.current} / {syncProgress.total}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowSyncConfirm(true)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bu Haftanın Programını Google Takvime Ekle</span>
                </button>
              </div>
            )}

            {/* TAB 2: ETKİNLİK LİSTESİ & EKLEME */}
            {activeTab === 'events' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Gelecek 14 Günün Etkinlikleri
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={loadCalendarEvents}
                      disabled={isLoading}
                      title="Yenile"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Yeni Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Manuel Etkinlik Ekleme Formu */}
                {showAddForm && (
                  <form onSubmit={handleCreateEvent} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs animate-in fade-in">
                    <input
                      type="text"
                      required
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      placeholder="Etkinlik veya sınav adı (ör: Matematik 1. Yazılı)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        required
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="px-2 py-1 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                      <input
                        type="time"
                        required
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="px-2 py-1 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                      <input
                        type="time"
                        required
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="px-2 py-1 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1 text-slate-500 hover:bg-slate-200 rounded-lg text-xs"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Kaydet
                      </button>
                    </div>
                  </form>
                )}

                {/* Etkinlik Listesi */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {events.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      Yaklaşan Google Takvim etkinliği bulunamadı.
                    </div>
                  ) : (
                    events.map((ev) => {
                      const startText = ev.start.dateTime
                        ? new Date(ev.start.dateTime).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ev.start.date || '';

                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <h5 className="font-semibold text-xs text-slate-800 truncate">
                              {ev.summary}
                            </h5>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{startText}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Google Takvimde Aç"
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setEventToDelete(ev)}
                              title="Etkinliği Sil"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SENKRONİZASYON ONAY MODALI */}
        {showSyncConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Calendar className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">Takvime Ekleme Onayı</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bu haftanın <strong>35 ders periyodu</strong> Google Takviminize eklenecektir. Her ders için zil saatinden 10 dakika önce hatırlatma bildirimi ayarlanacaktır.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSyncConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={executeSync}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Onayla ve Aktar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* YIKICI İŞLEM ONAY DİYALOĞU (MANDATORY CONFIRMATION) */}
        {eventToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-sm text-slate-900">Etkinliği Sil?</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Takviminizden <strong className="text-slate-900">&quot;{eventToDelete.summary}&quot;</strong> etkinliğini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={executeDeleteEvent}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
