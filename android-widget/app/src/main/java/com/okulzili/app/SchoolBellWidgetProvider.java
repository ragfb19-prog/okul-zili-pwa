package com.okulzili.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class SchoolBellWidgetProvider extends AppWidgetProvider {
    private static final String[] DAYS = {"Pazartesi","Salı","Çarşamba","Perşembe","Cuma"};
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) update(c, m, id);
    }
    public static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, SchoolBellWidgetProvider.class));
        for (int id : ids) update(c, m, id);
    }
    private static void update(Context c, AppWidgetManager manager, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.school_bell_widget);
        Intent open = new Intent(c, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_root, pi);
        Calendar cal = Calendar.getInstance();
        int dow = cal.get(Calendar.DAY_OF_WEEK);
        String day = dow >= 2 && dow <= 6 ? DAYS[dow-2] : "Hafta sonu";
        String now = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
        v.setTextViewText(R.id.widget_day, day + "  •  " + now);
        String json = c.getSharedPreferences("school_widget", Context.MODE_PRIVATE).getString("schedule", null);
        try {
            if (json == null || dow == 1 || dow == 7) throw new Exception();
            JSONArray slots = new JSONObject(json).optJSONArray(day);
            if (slots == null) throw new Exception();
            int minute = cal.get(Calendar.HOUR_OF_DAY)*60 + cal.get(Calendar.MINUTE);
            JSONObject current = null, next = null;
            int target = -1;
            for (int i=0; i<slots.length(); i++) {
                JSONObject s = slots.getJSONObject(i);
                int start = mins(s.optString("start")), end = mins(s.optString("end"));
                if (minute >= start && minute < end) { current=s; target=end-minute; break; }
                if (start > minute && (next == null || start < mins(next.optString("start")))) next=s;
            }
            if (current != null) {
                v.setTextViewText(R.id.widget_lesson, current.optString("title", "Ders"));
                v.setTextViewText(R.id.widget_next, "Bitiş: " + current.optString("end") + (next == null ? "" : "  •  Sonraki: "+next.optString("title")));
                v.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime()+target*60000L, null, true);
                v.setChronometerCountDown(R.id.widget_countdown, true);
                v.setViewVisibility(R.id.widget_countdown, android.view.View.VISIBLE);
            } else if (next != null) {
                int remaining = mins(next.optString("start"))-minute;
                v.setTextViewText(R.id.widget_lesson, "Sıradaki: " + next.optString("title"));
                v.setTextViewText(R.id.widget_next, "Başlangıç: " + next.optString("start"));
                v.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime()+remaining*60000L, null, true);
                v.setChronometerCountDown(R.id.widget_countdown, true);
            } else {
                v.setTextViewText(R.id.widget_lesson, "Dersler tamamlandı");
                v.setTextViewText(R.id.widget_next, "İyi günler");
                v.setTextViewText(R.id.widget_countdown, "--:--");
            }
        } catch (Exception e) {
            v.setTextViewText(R.id.widget_lesson, "Programı yüklemek için açın");
            v.setTextViewText(R.id.widget_next, "Uygulamaya dokunun");
            v.setTextViewText(R.id.widget_countdown, "--:--");
        }
        manager.updateAppWidget(id, v);
    }
    private static int mins(String hm) {
        try { String[] p=hm.split(":"); return Integer.parseInt(p[0])*60+Integer.parseInt(p[1]); }
        catch(Exception e) { return 0; }
    }
}
