package com.okulzili.app
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar
class SchoolCombinedWidgetProvider:AppWidgetProvider(){
 override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){
  val views=RemoteViews(context.packageName,R.layout.school_combined_widget)
  val now=Calendar.getInstance()
  val proverb=SchoolCalendarData.weeklyProverb(now)
  views.setTextViewText(R.id.combined_date,SchoolCalendarData.dateLabel(now))
  views.setTextViewText(R.id.combined_proverb,proverb.first)
  views.setTextViewText(R.id.combined_meaning,proverb.second)
  val day=mapOf(Calendar.MONDAY to "Pazartesi",Calendar.TUESDAY to "Salı",Calendar.WEDNESDAY to "Çarşamba",Calendar.THURSDAY to "Perşembe",Calendar.FRIDAY to "Cuma")[now.get(Calendar.DAY_OF_WEEK)]
  val raw=context.getSharedPreferences(SchoolBellWidgetProvider.PREFS,Context.MODE_PRIVATE).getString(SchoolBellWidgetProvider.KEY_SCHEDULE,null)
  var status="ZİL • PROGRAM";var lesson="Programı uygulamada eşitle"
  if(day!=null&&!raw.isNullOrBlank()) try {
   val slots=JSONObject(raw).optJSONArray(day);val min=now.get(Calendar.HOUR_OF_DAY)*60+now.get(Calendar.MINUTE)
   var active:JSONObject?=null;var upcoming:JSONObject?=null
   for(i in 0 until (slots?.length()?:0)){val slot=slots!!.optJSONObject(i)?:continue;val s=time(slot.optString("start"));val e=time(slot.optString("end"));if(min>=s&&min<e){active=slot;upcoming=slots.optJSONObject(i+1);break};if(s>min&&upcoming==null)upcoming=slot}
   if(active!=null){status="ŞU AN";lesson=active.optString("title")+" • "+active.optString("end")+(upcoming?.let{" • Sırada: "+it.optString("title")}?: "")}
   else if(upcoming!=null){status="SIRADAKİ DERS";lesson=upcoming.optString("title")+" • "+upcoming.optString("start")}
   else{status="DERSLER BİTTİ";lesson="Bugün okul bitti"}
  }catch(_:Exception){}
  val event=SchoolCalendarData.nextEvent(now)
  views.setTextViewText(R.id.combined_status,status);views.setTextViewText(R.id.combined_lesson,lesson)
  views.setTextViewText(R.id.combined_event,event.first+" • "+event.third)
  val open=android.app.PendingIntent.getActivity(context,3,Intent(context,MainActivity::class.java),android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
  views.setOnClickPendingIntent(R.id.combined_root,open)
  ids.forEach{manager.updateAppWidget(it,views)}
 }
 private fun time(s:String):Int{val p=s.split(":");return if(p.size==2)(p[0].toIntOrNull()?:0)*60+(p[1].toIntOrNull()?:0) else -1}
}