package com.okulzili.app
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar
class SchoolCombinedWidgetProvider:AppWidgetProvider(){
 override fun onReceive(context:Context,intent:Intent){super.onReceive(context,intent);if(intent.action=="com.okulzili.app.REFRESH_WIDGET"){val m=AppWidgetManager.getInstance(context);val ids=m.getAppWidgetIds(android.content.ComponentName(context,SchoolCombinedWidgetProvider::class.java));if(ids.isNotEmpty())onUpdate(context,m,ids)}}
 override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){
  val v=RemoteViews(context.packageName,R.layout.school_combined_widget);val now=Calendar.getInstance();val p=SchoolCalendarData.weeklyProverb(now)
  v.setTextViewText(R.id.combined_date,SchoolCalendarData.dateLabel(now));v.setTextViewText(R.id.combined_proverb,p.first);v.setTextViewText(R.id.combined_meaning,p.second)
  val day=mapOf(Calendar.MONDAY to "Pazartesi",Calendar.TUESDAY to "Salı",Calendar.WEDNESDAY to "Çarşamba",Calendar.THURSDAY to "Perşembe",Calendar.FRIDAY to "Cuma")[now.get(Calendar.DAY_OF_WEEK)]
  val raw=context.getSharedPreferences(SchoolBellWidgetProvider.PREFS,Context.MODE_PRIVATE).getString(SchoolBellWidgetProvider.KEY_SCHEDULE,null);var status="ZİL • PROGRAM";var lesson="Programı uygulamada eşitle"
  if(day!=null&&!raw.isNullOrBlank())try{val slots=JSONObject(raw).optJSONArray(day);val min=now.get(Calendar.HOUR_OF_DAY)*60+now.get(Calendar.MINUTE);var active:JSONObject?=null;var next:JSONObject?=null
   for(i in 0 until (slots?.length()?:0)){val s=slots!!.optJSONObject(i)?:continue;val a=minute(s.optString("start"));val b=minute(s.optString("end"));if(min>=a&&min<b){active=s;next=slots.optJSONObject(i+1);break};if(a>min&&next==null)next=s}
   if(active!=null){status="ŞU AN";lesson=active.optString("title")+" • "+active.optString("end")+(next?.let{" • Sırada: "+it.optString("title")}?: "")}else if(next!=null){status="SIRADAKİ DERS";lesson=next.optString("title")+" • "+next.optString("start")}else{status="DERSLER BİTTİ";lesson="Bugün okul bitti"}
  }catch(_:Exception){}
  val event=SchoolCalendarData.nextEvent(now);v.setTextViewText(R.id.combined_status,status);v.setTextViewText(R.id.combined_lesson,lesson);v.setTextViewText(R.id.combined_event,event.first+" • "+event.third)
  val pi=android.app.PendingIntent.getActivity(context,3,Intent(context,MainActivity::class.java),android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE);v.setOnClickPendingIntent(R.id.combined_root,pi);ids.forEach{manager.updateAppWidget(it,v)}
 }
 private fun minute(s:String):Int{val p=s.split(":");return if(p.size==2)(p[0].toIntOrNull()?:0)*60+(p[1].toIntOrNull()?:0)else -1}
}