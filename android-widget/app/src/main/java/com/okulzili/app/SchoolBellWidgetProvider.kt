package com.okulzili.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

class SchoolBellWidgetProvider : AppWidgetProvider() {
    companion object {
        const val PREFS = "school_bell_widget"
        const val KEY_SCHEDULE = "schedule_json"
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
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SCHEDULE, null)
        val views = RemoteViews(context.packageName, R.layout.school_bell_widget)
        val pending = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pending)

        val cal = Calendar.getInstance()
        val day = dayNames[cal.get(Calendar.DAY_OF_WEEK)]
        val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        views.setTextViewText(R.id.widget_clock, String.format("%02d:%02d", cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE)))
        views.setTextViewText(R.id.widget_day, day ?: "Hafta sonu")
        views.setViewVisibility(R.id.widget_countdown, android.view.View.GONE)

        if (day == null) {
            views.setTextViewText(R.id.widget_status, "HAFTA SONU")
            views.setTextViewText(R.id.widget_lesson, "Ders yok")
            views.setTextViewText(R.id.widget_next, "Pazartesi programı için dokun")
            views.setTextViewText(R.id.widget_note, "Okul Zili")
        } else if (raw.isNullOrBlank()) {
            views.setTextViewText(R.id.widget_status, "CANLI DERS PROGRAMI")
            views.setTextViewText(R.id.widget_lesson, "Programı yükle")
            views.setTextViewText(R.id.widget_next, "Uygulamayı aç; widget eşitlenir.")
            views.setTextViewText(R.id.widget_note, "Ders notları burada görünür.")
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

                if (current != null) {
                    views.setTextViewText(R.id.widget_status, "ŞU AN")
                    val remainingMs = ((toMinutes(current.optString("end")) - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L).coerceAtLeast(0L)
                    views.setViewVisibility(R.id.widget_countdown, android.view.View.VISIBLE)
                    views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + remainingMs, null, true)
                    views.setTextViewText(R.id.widget_lesson, current.optString("title", "Ders"))
                    val nextTitle = next?.optString("title")?.takeIf { it.isNotBlank() }
                    val nextText = if (nextTitle != null) " • Sırada: $nextTitle" else ""
                    views.setTextViewText(R.id.widget_next, "Bitiş ${current.optString("end")}$nextText")
                    views.setTextViewText(R.id.widget_note, current.optString("notes").ifBlank { "Bu ders için not yok." })
                } else if (next != null) {
                    views.setTextViewText(R.id.widget_status, "SIRADAKİ DERS")
                    val untilStartMs = ((toMinutes(next.optString("start")) - now) * 60_000L - cal.get(Calendar.SECOND) * 1000L).coerceAtLeast(0L)
                    views.setViewVisibility(R.id.widget_countdown, android.view.View.VISIBLE)
                    views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + untilStartMs, null, true)
                    views.setTextViewText(R.id.widget_lesson, next.optString("title", "Ders"))
                    views.setTextViewText(R.id.widget_next, "Başlangıç ${next.optString("start")}")
                    views.setTextViewText(R.id.widget_note, next.optString("notes").ifBlank { "Ekli ders notu yok." })
                } else {
                    views.setTextViewText(R.id.widget_status, "GÜN TAMAMLANDI")
                    views.setTextViewText(R.id.widget_lesson, "Dersler bitti")
                    views.setTextViewText(R.id.widget_next, "Yarın görüşürüz.")
                    views.setTextViewText(R.id.widget_note, "")
                }
            } catch (_: Exception) {
                views.setTextViewText(R.id.widget_status, "PROGRAM")
                views.setTextViewText(R.id.widget_lesson, "Veri okunamadı")
                views.setTextViewText(R.id.widget_next, "Uygulamayı açıp tekrar eşitle.")
                views.setTextViewText(R.id.widget_note, "")
            }
        }

        ids.forEach { manager.updateAppWidget(it, views) }
    }

    private fun toMinutes(value: String): Int {
        val parts = value.split(":")
        if (parts.size != 2) return -1
        return (parts[0].toIntOrNull() ?: return -1) * 60 + (parts[1].toIntOrNull() ?: return -1)
    }
}
