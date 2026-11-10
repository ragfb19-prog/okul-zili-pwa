import React from 'react';
import { ArrowRightCircle, Bell, Sparkles } from 'lucide-react';
import { ScheduleItem } from '../types';
import { formatCountdown, timeToSeconds, getTodayTurkishDay } from '../utils/constants';

interface Props {
  todaySlots: ScheduleItem[];
  now: Date;
  onPlayBell: () => void;
}

export const LiveCountdownWidget: React.FC<Props> = ({ todaySlots, now, onPlayBell }) => {
  const { day: todayDayName, isWeekend } = getTodayTurkishDay();

  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const firstSlot = todaySlots[0];
  const lastSlot = todaySlots[todaySlots.length - 1];

  const firstSlotSec = firstSlot ? timeToSeconds(firstSlot.start) : 0;
  const lastSlotSec = lastSlot ? timeToSeconds(lastSlot.end) : 0;

  const formattedDate = now.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Hafta Sonu Durumu
  if (isWeekend) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 sm:p-7 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Hafta Sonu Dinlenmesi</span>
              </span>
              <span className="text-xs text-indigo-200/70 font-medium">{formattedDate}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hafta Sonu Tatili 🌟
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 flex items-center gap-1.5 pt-0.5">
              <ArrowRightCircle className="w-4 h-4 text-indigo-400" />
              <span>Yeni haftanın ilk dersi: <strong>Pazartesi 08:40</strong></span>
            </p>
          </div>

          <div className="w-full sm:w-auto bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center sm:text-right shrink-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
              Durum
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-400 font-mono mt-0.5">
              Tatil
            </div>
            <span className="text-[10px] text-indigo-300">İyi dinlenmeler dileriz!</span>
          </div>
        </div>
      </div>
    );
  }

  // Ders Başlamadan Önce (Sabah)
  if (nowSec < firstSlotSec) {
    const left = firstSlotSec - nowSec;
    const progress = Math.min(100, Math.max(0, ((firstSlotSec - left) / firstSlotSec) * 100));

    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-sky-500/20 text-sky-200 border border-sky-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>Ders Öncesi Hazırlık</span>
              </span>
              <span className="text-xs text-indigo-200/70 font-medium">{todayDayName}, {formattedDate}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Okul Başlamak Üzere 🎒
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 flex items-center gap-1.5 pt-0.5">
              <ArrowRightCircle className="w-4 h-4 text-indigo-400" />
              <span>Günün İlk Dersi: <strong>{firstSlot?.title || '1. Ders'} ({firstSlot?.start})</strong></span>
            </p>
          </div>

          <div className="w-full sm:w-auto bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center sm:text-right shrink-0">
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
                İlk Zile Kalan
              </span>
              <button
                onClick={onPlayBell}
                title="Zil Sesini Test Et"
                className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-amber-300 font-mono mt-0.5">
              {formatCountdown(left)}
            </div>
            <span className="text-[10px] text-indigo-300">İlk ders saat {firstSlot?.start}&apos;ta başlar</span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-indigo-200/80 mb-1.5 font-medium">
            <span>07:00</span>
            <span>%{Math.round(progress)} Yaklaştı</span>
            <span>{firstSlot?.start}</span>
          </div>
          <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Okul Çıkışı (Tüm dersler bitti)
  if (nowSec >= lastSlotSec) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Okul Çıkışı</span>
              </span>
              <span className="text-xs text-emerald-200/70 font-medium">{todayDayName}, {formattedDate}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Günün Dersleri Bitti! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 flex items-center gap-1.5 pt-0.5">
              <ArrowRightCircle className="w-4 h-4 text-emerald-400" />
              <span>Bugünkü 7 ders başarıyla tamamlandı. Dinlenme vakti!</span>
            </p>
          </div>

          <div className="w-full sm:w-auto bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center sm:text-right shrink-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
              Günün Durumu
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-300 font-mono mt-0.5">
              Bitti
            </div>
            <span className="text-[10px] text-emerald-200">Çıkış Zili Çaldı</span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-emerald-200/80 mb-1.5 font-medium">
            <span>{firstSlot?.start}</span>
            <span>%100 Tamamlandı</span>
            <span>{lastSlot?.end}</span>
          </div>
          <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Şu An Devam Eden Ders veya Teneffüs
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

  if (!currentItem) {
    currentItem = firstSlot;
  }

  const sSec = timeToSeconds(currentItem.start);
  const eSec = timeToSeconds(currentItem.end);
  const leftSec = Math.max(0, eSec - nowSec);
  const totalPeriod = Math.max(1, eSec - sSec);
  const periodProgress = Math.min(100, Math.max(0, ((totalPeriod - leftSec) / totalPeriod) * 100));

  const isLesson = currentItem.type === 'ders';
  const isLunch = currentItem.type === 'ogle';

  let badgeColor = isLesson
    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
    : isLunch
    ? 'bg-amber-500/30 text-amber-200 border-amber-400/30'
    : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30';

  let badgeText = isLesson ? 'Şu An Ders' : isLunch ? 'Öğle Arası' : 'Teneffüs (Dinlenme)';
  let countdownLabel = isLesson ? 'Teneffüs Ziline Kalan' : 'Ders Ziline Kalan';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-indigo-800/40">
      {/* Decorative subtle ambient lights */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase border flex items-center gap-1.5 ${badgeColor}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{badgeText}</span>
            </span>
            <span className="text-xs text-indigo-200/70 font-medium">
              {todayDayName}, {formattedDate}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <span>{currentItem.title}</span>
            {currentItem.notes && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 font-normal">
                {currentItem.notes}
              </span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-indigo-200/80 flex items-center gap-1.5 pt-0.5">
            <ArrowRightCircle className="w-4 h-4 text-indigo-400" />
            <span>
              Sırada:{' '}
              {nextItem ? (
                <strong>
                  {nextItem.title} ({nextItem.start})
                </strong>
              ) : (
                <strong>Okul Çıkışı (15:15)</strong>
              )}
            </span>
          </p>
        </div>

        {/* Geri Sayım Kutusu */}
        <div className="w-full sm:w-auto bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center sm:text-right shrink-0">
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
              {countdownLabel}
            </span>
            <button
              onClick={onPlayBell}
              title="Zil Sesini Çal"
              className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono mt-0.5">
            {formatCountdown(leftSec)}
          </div>
          <span className="text-[10px] text-indigo-300">
            {currentItem.start} - {currentItem.end} ({currentItem.duration})
          </span>
        </div>
      </div>

      {/* İlerleme Çubuğu */}
      <div className="mt-5 pt-3.5 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-indigo-200/80 mb-1.5 font-medium">
          <span>{currentItem.start}</span>
          <span>%{Math.round(periodProgress)} Tamamlandı</span>
          <span>{currentItem.end}</span>
        </div>
        <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${periodProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
