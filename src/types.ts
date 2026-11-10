export type PeriodType = 'ders' | 'teneffus' | 'ogle';

export interface ScheduleItem {
  id: number;
  type: PeriodType;
  title: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  duration: string;
  notes?: string;
  teacher?: string;
  room?: string;
}

export type DayName = 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma';

export type WeekSchedule = Record<DayName, ScheduleItem[]>;

export interface RemoteAction {
  day?: DayName;
  lessonNumber?: number;
  newTitle?: string;
  newNotes?: string;
  summary?: string;
  timestamp?: number;
}
