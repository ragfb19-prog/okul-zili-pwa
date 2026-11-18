package com.okulzili.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.util.Calendar

class SchoolCalendarWidgetProvider : AppWidgetProvider() {
 override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
  val views=RemoteViews(context.packageName,R.layout.school_calendar_widget)
  val now=Calendar.getInstance()
  val event=SchoolCalendarData.nextEvent(now)
  views.setTextViewText(R.id.calendar_date,SchoolCalendarData.dateLabel(now))
  views.setTextViewText(R.id.calendar_title,event.first)
  views.setTextViewText(R.id.calendar_detail,event.second)
  views.setTextViewText(R.id.calendar_countdown,event.third)
  val open=android.app.PendingIntent.getActivity(context,2,Intent(context,MainActivity::class.java),android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
  views.setOnClickPendingIntent(R.id.calendar_root,open)
  ids.forEach { manager.updateAppWidget(it,views) }
 }
}
object SchoolCalendarData {
 data class Event(val title:String,val mmdd:String,val dateLabel:String)
 private val events=listOf(
  Event("Atatürk'ü Anma","11-10","10 Kasım"),
  Event("Öğretmenler Günü","11-24","24 Kasım"),
  Event("Dünya İnsan Hakları Günü","12-10","10 Aralık"),
  Event("Yeni Yıl","01-01","1 Ocak"),
  Event("Ulusal Egemenlik ve Çocuk Bayramı","04-23","23 Nisan"),
  Event("Emek ve Dayanışma Günü","05-01","1 Mayıs"),
  Event("Atatürk'ü Anma, Gençlik ve Spor Bayramı","05-19","19 Mayıs"),
  Event("Zafer Bayramı","08-30","30 Ağustos"),
  Event("Cumhuriyet Bayramı","10-29","29 Ekim")
 )
 fun dateLabel(c:Calendar):String=String.format("%02d %s %d",c.get(Calendar.DAY_OF_MONTH),listOf("Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık")[c.get(Calendar.MONTH)],c.get(Calendar.YEAR))
 private fun midnight(c:Calendar)= (c.clone() as Calendar).apply { set(Calendar.HOUR_OF_DAY,0);set(Calendar.MINUTE,0);set(Calendar.SECOND,0);set(Calendar.MILLISECOND,0) }
 fun nextEvent(now:Calendar):Triple<String,String,String> {
  val today=midnight(now)
  val candidate=events.map { e -> e to Calendar.getInstance().apply {
   set(Calendar.YEAR,now.get(Calendar.YEAR));set(Calendar.MONTH,e.mmdd.substringBefore("-").toInt()-1);set(Calendar.DAY_OF_MONTH,e.mmdd.substringAfter("-").toInt());set(Calendar.HOUR_OF_DAY,0);set(Calendar.MINUTE,0);set(Calendar.SECOND,0);set(Calendar.MILLISECOND,0)
   if(before(today)) add(Calendar.YEAR,1)
  }}.minByOrNull { it.second.timeInMillis } ?: return Triple("Takvim","Etkinlik yok","")
  val days=((candidate.second.timeInMillis-today.timeInMillis)/86400000L).toInt()
  return Triple(candidate.first.title,candidate.first.dateLabel,if(days==0)"BUGÜN" else "$days gün kaldı")
 }
 fun weeklyProverb(now:Calendar):Pair<String,String> {
  val items=listOf(
   "Damlaya damlaya göl olur." to "Küçük birikimler zamanla büyür.",
   "Birlikten kuvvet doğar." to "Birlikte çalışınca daha başarılı oluruz.",
   "Ağaç yaşken eğilir." to "İyi alışkanlıklar küçük yaşta kazanılır.",
   "Sakla samanı, gelir zamanı." to "Gereksiz görünen şey sonra işe yarayabilir.",
   "Ne ekersen onu biçersin." to "Davranışlarımızın sonuçlarını yaşarız.",
   "İşleyen demir ışıldar." to "Çalışan ve öğrenen kişi gelişir.",
   "Ak akçe kara gün içindir." to "Biriktirmek zor zamanlarda yardımcı olur.",
   "Dost kara günde belli olur." to "Gerçek dost zor zamanda yanında olandır.",
   "Tatlı dil yılanı deliğinden çıkarır." to "Güzel söz birçok sorunu çözer.",
   "Ayağını yorganına göre uzat." to "Harcamalarını imkânına göre yap.",
   "Erken kalkan yol alır." to "İşe erken başlamak avantaj sağlar.",
   "Ev alma, komşu al." to "İyi komşuluk çok değerlidir."
  )
  val week=now.get(Calendar.WEEK_OF_YEAR)+now.get(Calendar.YEAR)*53
  return items[Math.floorMod(week,items.size)]
 }
}