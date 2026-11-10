import { ScheduleItem, DayName, WeekSchedule } from '../types';

export const OFFICIAL_TEMPLATE: ScheduleItem[] = [
  { id: 1, type: 'ders', title: '1. Ders', start: '08:40', end: '09:20', duration: '40 Dakika', notes: '' },
  { id: 2, type: 'teneffus', title: 'Dinlenme', start: '09:20', end: '09:35', duration: '15 Dakika', notes: '' },
  { id: 3, type: 'ders', title: '2. Ders', start: '09:35', end: '10:15', duration: '40 Dakika', notes: '' },
  { id: 4, type: 'teneffus', title: 'Dinlenme', start: '10:15', end: '10:30', duration: '15 Dakika', notes: '' },
  { id: 5, type: 'ders', title: '3. Ders', start: '10:30', end: '11:10', duration: '40 Dakika', notes: '' },
  { id: 6, type: 'teneffus', title: 'Dinlenme', start: '11:10', end: '11:25', duration: '15 Dakika', notes: '' },
  { id: 7, type: 'ders', title: '4. Ders', start: '11:25', end: '12:05', duration: '40 Dakika', notes: '' },
  { id: 8, type: 'ogle', title: 'Öğle Arası', start: '12:05', end: '12:55', duration: '50 Dakika', notes: 'Öğle yemeği ve dinlenme.' },
  { id: 9, type: 'ders', title: '5. Ders', start: '12:55', end: '13:35', duration: '40 Dakika', notes: '' },
  { id: 10, type: 'teneffus', title: 'Dinlenme', start: '13:35', end: '13:45', duration: '10 Dakika', notes: '' },
  { id: 11, type: 'ders', title: '6. Ders', start: '13:45', end: '14:25', duration: '40 Dakika', notes: '' },
  { id: 12, type: 'teneffus', title: 'Dinlenme', start: '14:25', end: '14:35', duration: '10 Dakika', notes: '' },
  { id: 13, type: 'ders', title: '7. Ders', start: '14:35', end: '15:15', duration: '40 Dakika', notes: 'Günün son dersi.' }
];

export const DAYS_LIST: DayName[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export function createFreshWeek(): WeekSchedule {
  return {
    'Pazartesi': JSON.parse(JSON.stringify(OFFICIAL_TEMPLATE)),
    'Salı': JSON.parse(JSON.stringify(OFFICIAL_TEMPLATE)),
    'Çarşamba': JSON.parse(JSON.stringify(OFFICIAL_TEMPLATE)),
    'Perşembe': JSON.parse(JSON.stringify(OFFICIAL_TEMPLATE)),
    'Cuma': JSON.parse(JSON.stringify(OFFICIAL_TEMPLATE))
  };
}

export function timeToSeconds(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

export function formatCountdown(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getTodayTurkishDay(): { day: DayName | 'Hafta Sonu'; isWeekend: boolean } {
  const dayIndex = new Date().getDay();
  if (dayIndex === 0 || dayIndex === 6) {
    return { day: 'Hafta Sonu', isWeekend: true };
  }
  const map: Record<number, DayName> = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
  };
  return { day: map[dayIndex] || 'Pazartesi', isWeekend: false };
}
