import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Mic,
  Calendar,
  Volume2,
  VolumeX,
  Sun,
  SunDim,
  HelpCircle,
  ArrowRight,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';
import { ScheduleItem, DayName } from '../types';
import { formatCountdown, timeToSeconds, getTodayTurkishDay } from '../utils/constants';

interface Props {
  todaySlots: ScheduleItem[];
  now: Date;
  currentDay: DayName;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPlayBell: () => void;
  onOpenRemote: () => void;
  onOpenFullSchedule: () => void;
  onCloseWidgetMode?: () => void;
}

export const PhoneWidgetMode: React.FC<Props> = ({
  todaySlots,
  now,
  currentDay,
  soundEnabled,
  onToggleSound,
  onPlayBell,
  onOpenRemote,
  onOpenFullSchedule,
  onCloseWidgetMode,
}) => {
  const [isWakeLocked, setIsWakeLocked] = useState<boolean>(false);
  const [wakeLockObj, setWakeLockObj] = useState<any>(null);

  // WakeLock API (Ekranın kapanmasını engelleme)
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (!isWakeLocked) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLockObj(lock);
          setIsWakeLocked(true);
          lock.addEventListener('release', () => {
            setIsWakeLocked(false);
            setWakeLockObj(null);
          });
        } catch (err) {
          console.warn('WakeLock hatası:', err);
        }
      } else {
        wakeLockObj?.release();
        setIsWakeLocked(false);
        setWakeLockObj(null);
      }
    } else {
      alert('Cihazınız WakeLock özelliğini desteklemiyor.');
    }
  };

  const { isWeekend } = getTodayTurkishDay();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const firstSlot = todaySlots[0];
  const lastSlot = todaySlots[todaySlots.length - 1];
  const dailyNotes = todaySlots.filter((slot) => Boolean(slot.notes?.trim()));

  const firstSlotSec = firstSlot ? timeToSeconds(firstSlot.start) : 0;
  const lastSlotSec = lastSlot ? timeToSeconds(lastSlot.end) : 0;

  let currentItem: ScheduleItem | null = null;
  let nextItem: ScheduleItem | null = null;

  for (let i = 0; i < todaySlots.length; i++) {
    const item = todaySlots[i];
    const sSec = timeToSeconds(item.start);
    const eSec = timeToSeconds(item.end);

    if (nowSec >= sSec && nowSec < eSec) {
      currentItem = item;
      nextItem = todaySlots[i + 1] || null;
      break;
    }
  }

  let title = 'Okul Programı';
  let subText = 'Hesaplanıyor...';
  let countdownLabel = 'Zile Kalan';
  let countdownSec = 0;
  let progress = 0;
  let badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30';
  let badgeText = 'Ders Takibi';

  if (isWeekend) {
    title = 'Hafta Sonu Tatili';
    subText = 'Pazartesi ilk ders: 08:40';
    countdownLabel = 'Durum';
    badgeText = 'Tatil';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
  } else if (nowSec < firstSlotSec) {
    const left = firstSlotSec - nowSec;
    title = 'Okul Başlamak Üzere';
    subText = `İlk Ders: ${firstSlot?.title || '1. Ders'} (${firstSlot?.start})`;
    countdownLabel = 'İlk Zile Kalan';
    countdownSec = left;
    progress = Math.min(100, Math.max(0, ((firstSlotSec - left) / firstSlotSec) * 100));
    badgeText = 'Ders Öncesi';
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-400/30';
  } else if (nowSec >= lastSlotSec) {
    title = 'Günün Dersleri Bitti! 🎉';
    subText = 'Tüm dersler tamamlandı.';
    countdownLabel = 'Okul Çıkışı';
    progress = 100;
    badgeText = 'Çıkış Zili Çaldı';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
  } else if (currentItem) {
    const sSec = timeToSeconds(currentItem.start);
    const eSec = timeToSeconds(currentItem.end);
    countdownSec = Math.max(0, eSec - nowSec);
    const totalPeriod = Math.max(1, eSec - sSec);
    progress = Math.min(100, Math.max(0, ((totalPeriod - countdownSec) / totalPeriod) * 100));

    const isLesson = currentItem.type === 'ders';
    const isLunch = currentItem.type === 'ogle';

    title = currentItem.title;
    subText = nextItem ? `Sırada: ${nextItem.title} (${nextItem.start})` : 'Sırada: Okul Çıkışı (15:15)';
    countdownLabel = isLesson ? 'Teneffüs Ziline' : isLunch ? 'Ders Ziline (Öğle Arası)' : 'Ders Ziline Kalan';
    badgeText = isLesson ? 'Şu An Ders' : isLunch ? 'Öğle Arası' : 'Teneffüs';
    badgeColor = isLesson
      ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
      : isLunch
      ? 'bg-amber-500/30 text-amber-200 border-amber-400/30'
      : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30';
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Üst Çubuk */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-sm font-bold tracking-tight text-slate-300">
            {now.toLocaleTimeString('tr-TR')}
          </span>
          <span className="text-xs text-slate-500">({currentDay})</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Ekranı Açık Tut (Masa Standı Modu) */}
          <button
            onClick={toggleWakeLock}
            title={isWakeLocked ? 'Ekran kilidi açık (kapanmaz)' : 'Ekranı açık tut'}
            className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 transition ${
              isWakeLocked ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {isWakeLocked ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <SunDim className="w-4 h-4" />}
            <span className="hidden sm:inline">{isWakeLocked ? 'Ekran Açık' : 'Uyanık Tut'}</span>
          </button>

          {/* Zil Sesi */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Zil Test */}
          <button
            onClick={onPlayBell}
            title="Zili Çal"
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition"
          >
            <Bell className="w-4 h-4" />
          </button>

          {onCloseWidgetMode && (
            <button
              onClick={onCloseWidgetMode}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Orta Alan: Büyük Canlı Widget Kartı (Masa & Kilit Ekranı Hissi) */}
      <div className="my-auto flex flex-col items-center justify-center text-center space-y-5 max-w-md mx-auto w-full px-2">
        {/* Rozet */}
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${badgeColor}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{badgeText}</span>
        </div>

        {/* Ana Ders Başlığı */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {title}
          </h1>
          {currentItem?.notes && (
            <p className="text-xs sm:text-sm text-indigo-300 font-medium bg-white/10 px-3 py-1 rounded-xl inline-block mt-1">
              📝 {currentItem.notes}
            </p>
          )}
        </div>

        {/* Dev Geri Sayım Rakamları */}
        <div className="py-2">
          <span className="block text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">
            {countdownLabel}
          </span>
          <div className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-amber-300 drop-shadow-md">
            {isWeekend || nowSec >= lastSlotSec ? 'ZİL' : formatCountdown(countdownSec)}
          </div>
        </div>

        {/* Sıradaki Etkinlik */}
        <div className="text-xs sm:text-sm text-indigo-200/90 flex items-center justify-center gap-1.5 font-medium bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{subText}</span>
        </div>

        {/* Günlük Notlar: yalnızca aktif ders değil, günün tüm notları */}
        {dailyNotes.length > 0 && (
          <section className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-left">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">📝 Günün Notları</span>
              <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">{dailyNotes.length} not</span>
            </div>
            <div className="max-h-24 space-y-1.5 overflow-y-auto pr-1">
              {dailyNotes.map((slot) => (
                <div key={slot.id} className="flex items-start gap-2 text-[11px] leading-snug text-slate-100">
                  <span className="shrink-0 font-mono font-bold text-amber-200">{slot.start}</span>
                  <span className="min-w-0"><strong className="text-white">{slot.title}:</strong> {slot.notes}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* İlerleme Çubuğu */}
        <div className="w-full space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>{currentItem?.start || '08:40'}</span>
            <span className="text-indigo-300 font-bold">%{Math.round(progress)} Tamamlandı</span>
            <span>{currentItem?.end || '15:15'}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alt Aksiyon Butonları */}
      <div className="space-y-2.5 pt-3 max-w-md mx-auto w-full">
        <div className="flex gap-2">
          <button
            onClick={onOpenRemote}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
          >
            <Mic className="w-4 h-4" />
            <span>🎤 Sesli Asistan</span>
          </button>

          <button
            onClick={onOpenFullSchedule}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>📋 Program</span>
          </button>
        </div>

        {/* Kapat / Geri Dön Butonu */}
        {onCloseWidgetMode && (
          <button
            onClick={onCloseWidgetMode}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Normal Program Görünümüne Dön
          </button>
        )}
      </div>
    </div>
  );
};
