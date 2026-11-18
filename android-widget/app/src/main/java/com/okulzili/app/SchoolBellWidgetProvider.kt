package com.okulzili.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class SchoolBellWidgetProvider : AppWidgetProvider() {
    companion object {
        const val PREFS = "school_bell_widget"
        const val KEY_SCHEDULE = "schedule_json"
        const val KEY_NOTES = "quick_notes_json"
        const val KEY_AGENDA = "agenda_json"
        const val KEY_TRANSPARENT = "widget_transparent"
        const val ACTION_REFRESH = "com.okulzili.app.REFRESH_WIDGET"

        private val dayNames = mapOf(
            Calendar.MONDAY to "Pazartesi",
            Calendar.TUESDAY to "Salı",
            Calendar.WEDNESDAY to "Çarşamba",
            Calendar.THURSDAY to "Perşembe",
            Calendar.FRIDAY to "Cuma"
        )

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, SchoolBellWidgetProvider::class.java))
            if (ids.isNotEmpty()) SchoolBellWidgetProvider().onUpdate(context, manager, ids)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refresh(context)
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_SCHEDULE, null)
        val agendaRaw = prefs.getString(KEY_AGENDA, null)
        val views = RemoteViews(context.packageName, R.layout.school_bell_widget)
        val openApp = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp)

        val transparent = prefs.getBoolean(KEY_TRANSPARENT, false)
        views.setInt(
            R.id.widget_root, "setBackgroundColor",
            if (transparent) android.graphics.Color.TRANSPARENT else android.graphics.Color.rgb(17, 24, 39)
        )

        val cal = Calendar.getInstance()
        val day = dayNames[cal.get(Calendar.DAY_OF_WEEK)]
        val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        views.setTextViewText(R.id.widget_clock, String.format("%02d:%02d", cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE)))
        views.setTextViewText(R.id.widget_day, day ?: "Hafta sonu")

        var agenda = JSONObject()
        try { if (!agendaRaw.isNullOrBlank()) agenda = JSONObject(agendaRaw) } catch (_: Exception) { }

        // Widget'taki not alanı yalnızca bugünün ders notlarını gösterir.
        val lessonNotes = mutableListOf<String>()
        if (day != null && !raw.isNullOrBlank()) {
            try {
                val slots = JSONObject(raw).optJSONArray(day) ?: JSONArray()
                for (i in 0 until slots.length()) {
                    val slot = slots.optJSONObject(i) ?: continue
                    if (slot.optString("type") != "ders") continue
                    val note = slot.optString("notes").trim()
                    if (note.isNotBlank()) {
                        val title = slot.optString("title").trim()
                        lessonNotes.add("${slot.optString("start")} ${title}: $note")
                    }
                }
            } catch (_: Exception) { }
        }
        val noteText = if (lessonNotes.isEmpty()) "" else "DERS NOTLARI\n" + lessonNotes.take(2).joinToString("  •  ")
        views.setTextViewText(R.id.widget_note, noteText)
        views.setViewVisibility(R.id.widget_note, if (noteText.isBlank()) View.GONE else View.VISIBLE)

        // Görevler ayrı yeşil alanda gösterilir.
        val taskLines = mutableListOf<String>()
        try {
            val tasks = agenda.optJSONArray("tasks") ?: JSONArray()
            for (i in 0 until tasks.length()) {
                val item = tasks.optJSONObject(i) ?: continue
                val text = item.optString("text").trim()
                if (!item.optBoolean("done", false) && text.isNotBlank()) taskLines.add("□ $text")
            }
        } catch (_: Exception) { }
        val taskText = if (taskLines.isEmpty()) "" else "GÖREVLER\n" + taskLines.take(2).joinToString("  •  ")
        views.setTextViewText(R.id.widget_tasks, taskText)
        views.setViewVisibility(R.id.widget_tasks, if (taskText.isBlank()) View.GONE else View.VISIBLE)

        // Hatırlatıcılar yalnızca içinde bulunulan haftada, geri sayım olmadan görünür.
        val daysToSunday = (Calendar.SUNDAY - cal.get(Calendar.DAY_OF_WEEK) + 7) % 7
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT)
        val shortDate = SimpleDateFormat("dd.MM", Locale.ROOT)
        val todayStart = (cal.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val reminderLines = mutableListOf<String>()
        val eventLines = mutableListOf<String>()
        fun addDatedItems(array: JSONArray?, target: MutableList<String>, prefix: String) {
            if (array == null) return
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val title = item.optString("text").trim()
                val dateValue = item.optString("date")
                if (title.isBlank()) continue
                val parsed = runCatching { dateFormat.parse(dateValue) }.getOrNull() ?: continue
                val eventCal = Calendar.getInstance().apply {
                    time = parsed
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }
                val days = ((eventCal.timeInMillis - todayStart.timeInMillis) / 86_400_000L).toInt()
                if (days in 0..daysToSunday) {
                    val whenText = if (days == 0) "BUGÜN" else shortDate.format(parsed)
                    target.add("$prefix $whenText • $title")
                }
            }
        }
        addDatedItems(agenda.optJSONArray("reminders"), reminderLines, "•")
        val reminderText = if (reminderLines.isEmpty()) "" else "HATIRLATICILAR\n" + reminderLines.take(2).joinToString("  •  ")
        views.setTextViewText(R.id.widget_reminders, reminderText)
        views.setViewVisibility(R.id.widget_reminders, if (reminderText.isBlank()) View.GONE else View.VISIBLE)

        addDatedItems(agenda.optJSONArray("events"), eventLines, "•")
        val official = SchoolCalendarData.nextEvent(cal)
        val officialDays = if (official.third == "BUGÜN") 0 else official.third.substringBefore(" ").toIntOrNull() ?: Int.MAX_VALUE
        if (officialDays in 0..daysToSunday) {
            eventLines.add("• ${if (officialDays == 0) "BUGÜN" else official.second} • ${official.first}")
        }
        val eventText = if (eventLines.isEmpty()) "" else "TAKVİM\n" + eventLines.take(2).joinToString("  •  ")
        views.setTextViewText(R.id.widget_quick_note, eventText)
        views.setViewVisibility(R.id.widget_quick_note, if (eventText.isBlank()) View.GONE else View.VISIBLE)

        // Geri sayım yok. Öğle arası/teneffüs adı yerine yalnızca aktif veya sıradaki ders yazılır.
        if (day == null) {
            views.setTextViewText(R.id.widget_status, "HAFTA SONU")
            views.setTextViewText(R.id.widget_lesson, "Ders yok")
            views.setTextViewText(R.id.widget_next, "Yeni hafta")
        } else if (raw.isNullOrBlank()) {
            views.setTextViewText(R.id.widget_status, "DERS PROGRAMI")
            views.setTextViewText(R.id.widget_lesson, "Programı eşitle")
            views.setTextViewText(R.id.widget_next, "Uygulamayı aç")
        } else {
            try {
                val slots = JSONObject(raw).optJSONArray(day) ?: JSONArray()
                var activeLesson: JSONObject? = null
                var nextLesson: JSONObject? = null
                var nextTransition: Int? = null
                var lastLessonEnd = 0
                for (i in 0 until slots.length()) {
                    val item = slots.optJSONObject(i) ?: continue
                    if (item.optString("type") != "ders") continue
                    val start = toMinutes(item.optString("start"))
                    val end = toMinutes(item.optString("end"))
                    if (start < 0 || end <= start) continue
                    lastLessonEnd = maxOf(lastLessonEnd, end)
                    if (now >= start && now < end) {
                        activeLesson = item
                        nextTransition = end
                        nextLesson = (i + 1 until slots.length()).asSequence()
                            .mapNotNull { slots.optJSONObject(it) }
                            .firstOrNull { it.optString("type") == "ders" }
                        break
                    }
                    if (start > now && nextLesson == null) {
                        nextLesson = item
                        nextTransition = start
                    }
                }

                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val refreshPending = PendingIntent.getBroadcast(
                    context, 101, Intent(ACTION_REFRESH).setPackage(context.packageName),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                if (nextTransition != null && nextTransition > now) {
                    val delay = (nextTransition - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L
                    alarmManager.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delay, refreshPending)
                } else alarmManager.cancel(refreshPending)

                when {
                    activeLesson != null -> {
                        views.setTextViewText(R.id.widget_status, "ŞU AN")
                        views.setTextViewText(R.id.widget_lesson, activeLesson.optString("title", "Ders"))
                        views.setTextViewText(R.id.widget_next, nextLesson?.let { "Sıradaki: ${it.optString("title")} • ${it.optString("start")}" } ?: "Ders devam ediyor")
                    }
                    nextLesson != null -> {
                        views.setTextViewText(R.id.widget_status, "SIRADAKİ DERS")
                        views.setTextViewText(R.id.widget_lesson, nextLesson.optString("title", "Ders"))
                        views.setTextViewText(R.id.widget_next, "Başlangıç: ${nextLesson.optString("start")}")
                    }
                    now >= lastLessonEnd -> {
                        views.setTextViewText(R.id.widget_status, "GÜN TAMAMLANDI")
                        views.setTextViewText(R.id.widget_lesson, "Dersler bitti")
                        views.setTextViewText(R.id.widget_next, "İyi dinlenmeler")
                    }
                    else -> {
                        views.setTextViewText(R.id.widget_status, "DERS PROGRAMI")
                        views.setTextViewText(R.id.widget_lesson, "Ders arası")
                        views.setTextViewText(R.id.widget_next, "Sonraki ders bekleniyor")
                    }
                }
            } catch (_: Exception) {
                views.setTextViewText(R.id.widget_status, "DERS PROGRAMI")
                views.setTextViewText(R.id.widget_lesson, "Veri okunamadı")
                views.setTextViewText(R.id.widget_next, "Uygulamayı açıp eşitle")
            }
        }

        ids.forEach { manager.updateAppWidget(it, views) }
    }

    private fun toMinutes(value: String): Int {
        val parts = value.split(":")
        if (parts.size != 2) return -1
        val hour = parts[0].toIntOrNull() ?: return -1
        val minute = parts[1].toIntOrNull() ?: return -1
        if (hour !in 0..23 || minute !in 0..59) return -1
        return hour * 60 + minute
    }
}
