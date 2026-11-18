package com.okulzili.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

class SchoolBellWidgetProvider : AppWidgetProvider() {
    companion object {
        const val PREFS = "school_bell_widget"
        const val KEY_SCHEDULE = "schedule_json"
        const val KEY_NOTES = "quick_notes_json"
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
        val views = RemoteViews(context.packageName, R.layout.school_bell_widget)
        val pending = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pending)

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

        // Sabit yemek/hatırlatma metinleri ve hızlı not önizlemesi kaldırıldı.
        // Takvim yalnızca bugün veya içinde bulunduğumuz 7 günlük aralıkta görünür.
        views.setViewVisibility(R.id.widget_quick_note, View.GONE)
        val event = SchoolCalendarData.nextEvent(cal)
        val daysUntil = if (event.third == "BUGÜN") 0 else event.third.substringBefore(" ").toIntOrNull() ?: Int.MAX_VALUE
        val showEvent = daysUntil in 0..7
        views.setViewVisibility(R.id.widget_note, if (showEvent) View.VISIBLE else View.GONE)
        if (showEvent) {
            views.setTextViewText(
                R.id.widget_note,
                "TAKVİM  •  ${event.first}  •  ${event.second}  •  ${event.third}"
            )
        } else {
            views.setTextViewText(R.id.widget_note, "")
        }
        views.setViewVisibility(R.id.widget_countdown, View.GONE)

        if (day == null) {
            views.setTextViewText(R.id.widget_status, "HAFTA SONU")
            views.setTextViewText(R.id.widget_lesson, "Ders yok")
            views.setTextViewText(R.id.widget_next, "Pazartesi programı için dokun")
        } else if (raw.isNullOrBlank()) {
            views.setTextViewText(R.id.widget_status, "CANLI DERS PROGRAMI")
            views.setTextViewText(R.id.widget_lesson, "Programı yükle")
            views.setTextViewText(R.id.widget_next, "Uygulamayı aç; widget eşitlenir.")
        } else {
            try {
                val slots = JSONObject(raw).optJSONArray(day) ?: JSONArray()
                var current: JSONObject? = null
                var next: JSONObject? = null
                for (i in 0 until slots.length()) {
                    val item = slots.optJSONObject(i) ?: continue
                    val start = toMinutes(item.optString("start"))
                    val end = toMinutes(item.optString("end"))
                    if (start >= 0 && end > start && now >= start && now < end) {
                        current = item
                        next = slots.optJSONObject(i + 1)
                        break
                    }
                    if (start > now && next == null) next = item
                }

                val transitionMinute = if (current != null) toMinutes(current.optString("end")) else next?.let { toMinutes(it.optString("start")) }
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val refreshIntent = Intent(ACTION_REFRESH).setPackage(context.packageName)
                val refreshPending = PendingIntent.getBroadcast(
                    context, 101, refreshIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                if (transitionMinute != null && transitionMinute > now) {
                    val delay = (transitionMinute - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L
                    alarmManager.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delay, refreshPending)
                } else {
                    alarmManager.cancel(refreshPending)
                }

                when {
                    current != null -> {
                        views.setTextViewText(R.id.widget_status, "ŞU AN")
                        val remainingMs = ((toMinutes(current.optString("end")) - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L).coerceAtLeast(0L)
                        views.setViewVisibility(R.id.widget_countdown, View.VISIBLE)
                        views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + remainingMs, null, true)
                        views.setTextViewText(R.id.widget_lesson, current.optString("title", "Ders"))
                        val nextTitle = next?.optString("title")?.takeIf { it.isNotBlank() }
                        val nextText = if (nextTitle != null) " • Sırada: $nextTitle" else ""
                        views.setTextViewText(R.id.widget_next, "Bitiş ${current.optString("end")}$nextText")
                    }
                    next != null -> {
                        views.setTextViewText(R.id.widget_status, "SIRADAKİ DERS")
                        val untilStartMs = ((toMinutes(next.optString("start")) - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L).coerceAtLeast(0L)
                        views.setViewVisibility(R.id.widget_countdown, View.VISIBLE)
                        views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + untilStartMs, null, true)
                        views.setTextViewText(R.id.widget_lesson, next.optString("title", "Ders"))
                        views.setTextViewText(R.id.widget_next, "Başlangıç ${next.optString("start")}")
                    }
                    else -> {
                        views.setTextViewText(R.id.widget_status, "GÜN TAMAMLANDI")
                        views.setTextViewText(R.id.widget_lesson, "Dersler bitti")
                        views.setTextViewText(R.id.widget_next, "Yarın görüşürüz.")
                    }
                }
            } catch (_: Exception) {
                views.setTextViewText(R.id.widget_status, "PROGRAM")
                views.setTextViewText(R.id.widget_lesson, "Veri okunamadı")
                views.setTextViewText(R.id.widget_next, "Uygulamayı açıp tekrar eşitle.")
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
