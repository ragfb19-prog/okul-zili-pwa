package com.okulzili.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

class SchoolCombinedWidgetProvider : AppWidgetProvider() {
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == SchoolBellWidgetProvider.ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, SchoolCombinedWidgetProvider::class.java))
            if (ids.isNotEmpty()) onUpdate(context, manager, ids)
        }
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        if (ids.isEmpty()) return
        val views = RemoteViews(context.packageName, R.layout.school_combined_widget)
        try {
            val now = Calendar.getInstance()
            val prefs = context.getSharedPreferences(SchoolBellWidgetProvider.PREFS, Context.MODE_PRIVATE)
            val transparent = prefs.getBoolean(SchoolBellWidgetProvider.KEY_TRANSPARENT, false)
            views.setInt(
                R.id.combined_root, "setBackgroundColor",
                if (transparent) android.graphics.Color.TRANSPARENT else android.graphics.Color.rgb(16, 24, 39)
            )
            views.setTextViewText(
                R.id.combined_date,
                SchoolCalendarData.dateLabel(now) + "  •  " +
                    String.format("%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE))
            )

            val day = when (now.get(Calendar.DAY_OF_WEEK)) {
                Calendar.MONDAY -> "Pazartesi"
                Calendar.TUESDAY -> "Salı"
                Calendar.WEDNESDAY -> "Çarşamba"
                Calendar.THURSDAY -> "Perşembe"
                Calendar.FRIDAY -> "Cuma"
                else -> null
            }
            var status = "ZİL • PROGRAM"
            var lesson = "Programı uygulamada eşitle"
            val raw = prefs.getString(SchoolBellWidgetProvider.KEY_SCHEDULE, null)

            if (day != null && !raw.isNullOrBlank()) {
                try {
                    val slots = JSONObject(raw).optJSONArray(day)
                    val minuteNow = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                    var active: JSONObject? = null
                    var next: JSONObject? = null
                    if (slots != null) {
                        for (i in 0 until slots.length()) {
                            val slot = slots.optJSONObject(i) ?: continue
                            if (slot.optString("type") != "ders") continue
                            val start = toMinutes(slot.optString("start"))
                            val end = toMinutes(slot.optString("end"))
                            if (start >= 0 && end > start && minuteNow >= start && minuteNow < end) {
                                active = slot
                                next = slots.optJSONObject(i + 1)
                                break
                            }
                            if (start > minuteNow && next == null) next = slot
                        }
                    }
                    when {
                        active != null -> {
                            status = "ŞU AN"
                            lesson = active.optString("title", "Ders") + " • " + active.optString("end")
                            if (next != null) lesson += " • Sırada: " + next.optString("title")
                        }
                        next != null -> {
                            status = "SIRADAKİ DERS"
                            lesson = next.optString("title", "Ders") + " • " + next.optString("start")
                        }
                        else -> {
                            status = "DERSLER BİTTİ"
                            lesson = "Bugün okul bitti"
                        }
                    }
                } catch (_: Exception) {
                    status = "PROGRAM"
                    lesson = "Program okunamadı; uygulamayı açıp eşitle"
                }
            } else if (day == null) {
                status = "HAFTA SONU"
                lesson = "Ders yok"
            }

            views.setTextViewText(R.id.combined_status, status)
            views.setTextViewText(R.id.combined_lesson, lesson)

            val event = SchoolCalendarData.nextEvent(now)
            val daysToSunday = (Calendar.SUNDAY - now.get(Calendar.DAY_OF_WEEK) + 7) % 7
            val daysUntil = if (event.third == "BUGÜN") 0 else event.third.substringBefore(" ").toIntOrNull() ?: Int.MAX_VALUE
            val showEvent = daysUntil in 0..daysToSunday
            views.setViewVisibility(R.id.combined_event, if (showEvent) View.VISIBLE else View.GONE)
            views.setTextViewText(
                R.id.combined_event,
                if (showEvent) "TAKVİM  •  ${event.first}  •  ${event.second}  •  ${if (daysUntil == 0) "BUGÜN" else "BU HAFTA"}" else ""
            )

            val openApp = PendingIntent.getActivity(
                context, 303, Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.combined_root, openApp)
        } catch (_: Exception) {
            views.setTextViewText(R.id.combined_date, "OKUL ZİLİ")
            views.setTextViewText(R.id.combined_status, "BİRLEŞTİRİLMİŞ WIDGET")
            views.setTextViewText(R.id.combined_lesson, "Veriler yüklenemedi")
            views.setTextViewText(R.id.combined_event, "")
            views.setViewVisibility(R.id.combined_event, View.GONE)
            val openApp = PendingIntent.getActivity(
                context, 303, Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.combined_root, openApp)
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
