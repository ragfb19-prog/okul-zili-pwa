import { WeekSchedule, DayName } from '../types';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
  });

  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Takvim etkinlikleri alınamadı (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    startDateTime: string; // ISO 8601
    endDateTime: string;   // ISO 8601
    timeZone?: string;
  }
): Promise<CalendarEvent> {
  const body = {
    summary: event.summary,
    description: event.description || '',
    start: {
      dateTime: event.startDateTime,
      timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 10 }],
    },
  };

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Takvim etkinliği oluşturulamadı (${res.status})`);
  }

  return await res.json();
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Takvim etkinliği silinemedi (${res.status})`);
  }
}

/**
 * Calculates date string YYYY-MM-DD for a specific weekday in current or target week
 */
export function getWeekdayDate(dayName: DayName, baseDate: Date = new Date()): string {
  const dayIndexMap: Record<DayName, number> = {
    Pazartesi: 1,
    Salı: 2,
    Çarşamba: 3,
    Perşembe: 4,
    Cuma: 5,
  };

  const targetDayOfWeek = dayIndexMap[dayName];
  const currentDayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...

  // Calculate Monday of current week
  const monday = new Date(baseDate);
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  monday.setDate(baseDate.getDate() + diffToMonday);

  // Target date
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (targetDayOfWeek - 1));

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Syncs the entire week's lessons to Google Calendar
 */
export async function syncScheduleToGoogleCalendar(
  accessToken: string,
  schedule: WeekSchedule,
  onProgress?: (current: number, total: number, itemName: string) => void
): Promise<{ createdCount: number }> {
  const days: DayName[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Flatten lessons to add
  const itemsToAdd: Array<{
    day: DayName;
    title: string;
    notes?: string;
    start: string;
    end: string;
    dateStr: string;
  }> = [];

  for (const day of days) {
    const slots = schedule[day] || [];
    const dateStr = getWeekdayDate(day);
    for (const slot of slots) {
      if (slot.type === 'ders') {
        itemsToAdd.push({
          day,
          title: slot.title,
          notes: slot.notes,
          start: slot.start,
          end: slot.end,
          dateStr,
        });
      }
    }
  }

  let createdCount = 0;
  for (let i = 0; i < itemsToAdd.length; i++) {
    const item = itemsToAdd[i];
    onProgress?.(i + 1, itemsToAdd.length, `${item.day} - ${item.title}`);

    const startDateTime = `${item.dateStr}T${item.start}:00`;
    const endDateTime = `${item.dateStr}T${item.end}:00`;

    await createCalendarEvent(accessToken, {
      summary: `[Ders] ${item.title}`,
      description: item.notes
        ? `Danişment Okul Programı\nNot: ${item.notes}\nSaat: ${item.start} - ${item.end}`
        : `Danişment Okul Programı\nSaat: ${item.start} - ${item.end}`,
      startDateTime,
      endDateTime,
      timeZone: tz,
    });

    createdCount++;
    // Small breath to avoid rate limits
    await new Promise((r) => setTimeout(r, 120));
  }

  return { createdCount };
}
