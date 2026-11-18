import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, ListChecks, CalendarDays, Plus, Trash2, Palette, ImagePlus, SlidersHorizontal, Smartphone, X, BellRing, CalendarCheck, CalendarClock } from 'lucide-react';

type Task = { id: number; text: string; done: boolean };
type DatedItem = { id: number; text: string; date: string };

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const dateLabel = (value: string) => {
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y, (m || 1)-1, d || 1).toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
};
const inThisWeek = (value: string) => {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const day = (today.getDay()+6)%7;
  const monday = new Date(today); monday.setDate(today.getDate()-day);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  const [y,m,d] = value.split('-').map(Number);
  const target = new Date(y,m-1,d); target.setHours(0,0,0,0);
  return target >= monday && target <= sunday;
};

export function TeacherTools() {
 const [notes,setNotes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('okul_zili_notes') || '[]'); } catch { return []; } });
 const [note,setNote] = useState('');
 const [tasks,setTasks] = useState<Task[]>(() => { try { return JSON.parse(localStorage.getItem('okul_zili_tasks') || '[]'); } catch { return []; } });
 const [task,setTask] = useState('');
 const [events,setEvents] = useState<DatedItem[]>(() => { try { return JSON.parse(localStorage.getItem('okul_zili_events') || '[]'); } catch { return []; } });
 const [event,setEvent] = useState('');
 const [reminders,setReminders] = useState<DatedItem[]>(() => { try { return JSON.parse(localStorage.getItem('okul_zili_reminders') || '[]'); } catch { return []; } });
 const [reminder,setReminder] = useState('');
 const [date,setDate] = useState(localDate());
 const [theme,setTheme] = useState(localStorage.getItem('okul_zili_theme') || 'classroom');
 const [background,setBackground] = useState(localStorage.getItem('okul_zili_custom_bg') || '');
 const [opacity,setOpacity] = useState(Number(localStorage.getItem('okul_zili_bg_opacity') || 35));
 const [transparentWidget,setTransparentWidget] = useState(localStorage.getItem('okul_zili_widget_transparent') === 'true');
 const imageRef = useRef<HTMLInputElement>(null);

 useEffect(() => { localStorage.setItem('okul_zili_notes',JSON.stringify(notes)); },[notes]);
 useEffect(() => { localStorage.setItem('okul_zili_tasks',JSON.stringify(tasks)); },[tasks]);
 useEffect(() => { localStorage.setItem('okul_zili_events',JSON.stringify(events)); },[events]);
 useEffect(() => { localStorage.setItem('okul_zili_reminders',JSON.stringify(reminders)); },[reminders]);
 useEffect(() => {
   try { (window as any).SchoolBellWidget?.updateAgenda?.(JSON.stringify({ notes, tasks, events, reminders })); } catch {}
 },[notes,tasks,events,reminders]);
 useEffect(() => { localStorage.setItem('okul_zili_theme',theme); document.documentElement.dataset.schoolTheme = theme; },[theme]);
 useEffect(() => {
   localStorage.setItem('okul_zili_custom_bg',background);
   document.documentElement.style.setProperty('--custom-school-bg', background ? 'url("' + background + '")' : 'none');
 },[background]);
 useEffect(() => {
   localStorage.setItem('okul_zili_bg_opacity',String(opacity));
   document.documentElement.style.setProperty('--custom-school-bg-opacity',String(opacity / 100));
 },[opacity]);
 useEffect(() => {
   localStorage.setItem('okul_zili_widget_transparent',String(transparentWidget));
   try { (window as any).SchoolBellWidget?.setWidgetTransparency?.(transparentWidget); } catch {}
 },[transparentWidget]);

 const addTask = () => { if(task.trim()){ setTasks([...tasks,{id:Date.now(),text:task.trim(),done:false}]); setTask(''); } };
 const addReminder = () => { if(reminder.trim()){ setReminders([...reminders,{id:Date.now(),text:reminder.trim(),date}].sort((a,b)=>a.date.localeCompare(b.date))); setReminder(''); } };
 const addEvent = () => { if(event.trim()){ setEvents([...events,{id:Date.now(),text:event.trim(),date}].sort((a,b)=>a.date.localeCompare(b.date))); setEvent(''); } };
 const chooseBackground = (file?: File) => {
   if (!file || !file.type.startsWith('image/')) return;
   const reader = new FileReader();
   reader.onload = () => {
     const img = new Image();
     img.onload = () => {
       const scale = Math.min(1, 1600 / Math.max(img.width,img.height));
       const canvas = document.createElement('canvas');
       canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
       canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);
       setBackground(canvas.toDataURL('image/jpeg',0.78));
     };
     img.src = String(reader.result);
   };
   reader.readAsDataURL(file);
 };

 const thisWeek = [
   ...reminders.filter(x=>inThisWeek(x.date)).map(x=>({...x,kind:'Hatırlatıcı'})),
   ...events.filter(x=>inThisWeek(x.date)).map(x=>({...x,kind:'Etkinlik'}))
 ].sort((a,b)=>a.date.localeCompare(b.date));

 return <section className='teacher-tools rounded-3xl border border-amber-200 p-4 sm:p-5 space-y-5 shadow-sm'>
  <div className='flex items-center justify-between gap-3'>
   <div><h2 className='font-bold text-slate-800 flex items-center gap-2'><CalendarCheck className='w-5 h-5 text-indigo-600'/> Ajandam</h2><p className='text-[11px] text-slate-500 mt-1'>Notlar, görevler ve tarihli hatırlatmalar tek yerde</p></div>
   <span className='text-[10px] text-slate-500 text-right'>Çevrimdışı<br/>cihazda kayıt</span>
  </div>

  <div className='rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3'>
   <h3 className='font-bold text-xs text-indigo-900 flex items-center gap-2 mb-2'><CalendarDays size={16}/> Bu haftanın takvimi</h3>
   {thisWeek.length ? <div className='space-y-1.5'>{thisWeek.map(x=><div key={x.kind+x.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${x.kind==='Hatırlatıcı'?'bg-rose-100 text-rose-900':'bg-sky-100 text-sky-900'}`}><b className='shrink-0'>{dateLabel(x.date)}</b><span className='flex-1 min-w-0 truncate'>{x.text}</span><span className='text-[9px] font-bold uppercase'>{x.kind}</span></div>)}</div> : <p className='text-xs text-indigo-700/70'>Bu hafta için tarihli kayıt yok.</p>}
  </div>

  <section className='rounded-2xl border border-amber-200 bg-amber-50/70 p-3 space-y-2'>
   <h3 className='font-semibold text-sm text-amber-900 flex items-center gap-2'><StickyNote size={17}/> Ders dışı notlar</h3>
   <div className='flex gap-2'><input value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==='Enter'&&note.trim()&&(setNotes([note.trim(),...notes]),setNote(''))} placeholder='Kısa not ekle...' className='min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm'/><button onClick={()=>{if(note.trim()){setNotes([note.trim(),...notes]);setNote('');}}} className='rounded-xl bg-amber-500 px-3 text-white'><Plus size={18}/></button></div>
   {notes.map((n,i)=><div key={i} className='flex items-start gap-2 rounded-xl bg-white/80 p-2 text-sm'><span className='flex-1'>{n}</span><button onClick={()=>setNotes(notes.filter((_,j)=>j!==i))} aria-label='Notu sil'><Trash2 size={15}/></button></div>)}
  </section>

  <section className='rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2'>
   <h3 className='font-semibold text-sm text-emerald-900 flex gap-2 items-center'><ListChecks size={17}/> Görevler</h3>
   <div className='flex gap-2'><input value={task} onChange={e=>setTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()} placeholder='Yapılacak görev...' className='min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm'/><button onClick={addTask} className='rounded-xl bg-emerald-600 px-3 text-white'><Plus size={18}/></button></div>
   {tasks.map(t=><div key={t.id} className='flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-sm'><input type='checkbox' checked={t.done} onChange={e=>setTasks(tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x))}/><span className={'flex-1 '+(t.done?'line-through text-slate-400':'text-emerald-950')}>{t.text}</span><button onClick={()=>setTasks(tasks.filter(x=>x.id!==t.id))}><Trash2 size={15}/></button></div>)}
  </section>

  <section className='rounded-2xl border border-rose-200 bg-rose-50/70 p-3 space-y-2'>
   <h3 className='font-semibold text-sm text-rose-900 flex gap-2 items-center'><BellRing size={17}/> Hatırlatıcılar</h3>
   <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'><input type='date' value={date} onChange={e=>setDate(e.target.value)} className='min-w-0 rounded-xl border border-rose-200 bg-white px-2 py-2 text-xs'/><span className='self-center text-[10px] text-rose-700'>Tarih seç</span></div>
   <div className='flex gap-2'><input value={reminder} onChange={e=>setReminder(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addReminder()} placeholder='Hatırlatılacak konu...' className='min-w-0 flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm'/><button onClick={addReminder} className='rounded-xl bg-rose-600 px-3 text-white'><Plus size={18}/></button></div>
   {reminders.map(r=><div key={r.id} className='flex items-center gap-2 rounded-lg bg-white/80 px-2 py-2 text-xs text-rose-950'><b className='shrink-0'>{dateLabel(r.date)}</b><span className='flex-1 min-w-0'>{r.text}</span><button onClick={()=>setReminders(reminders.filter(x=>x.id!==r.id))}><Trash2 size={14}/></button></div>)}
  </section>

  <section className='rounded-2xl border border-sky-200 bg-sky-50/70 p-3 space-y-2'>
   <h3 className='font-semibold text-sm text-sky-900 flex gap-2 items-center'><CalendarClock size={17}/> Takvim etkinlikleri</h3>
   <div className='flex gap-2'><input value={event} onChange={e=>setEvent(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEvent()} placeholder='Sınav, toplantı, nöbet...' className='min-w-0 flex-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm'/><button onClick={addEvent} className='rounded-xl bg-sky-600 px-3 text-white'><Plus size={18}/></button></div>
   {events.map(ev=><div key={ev.id} className='flex gap-2 rounded-lg bg-white/80 p-2 text-xs text-sky-950'><b className='shrink-0'>{dateLabel(ev.date)}</b><span className='flex-1 min-w-0'>{ev.text}</span><button onClick={()=>setEvents(events.filter(x=>x.id!==ev.id))}><Trash2 size={14}/></button></div>)}
  </section>

  <section className='border-t border-slate-200 pt-4 space-y-3'>
   <h3 className='font-semibold text-sm text-slate-700 flex gap-2 items-center'><Palette size={17}/> Görünüm ve kişiselleştirme</h3>
   <div className='flex items-center justify-between gap-3'><span className='text-xs font-medium text-slate-600'>Hazır tema</span><select value={theme} onChange={e=>setTheme(e.target.value)} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs'><option value='classroom'>Neşeli sınıf</option><option value='paper'>Defter kâğıdı</option><option value='chalkboard'>Kara tahta</option></select></div>
   <div className='rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-2'>
    <div className='flex items-center justify-between'><span className='text-xs font-semibold flex items-center gap-2'><ImagePlus size={16}/> Kendi arka plan fotoğrafın</span><button onClick={()=>imageRef.current?.click()} className='rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white'>Fotoğraf seç</button></div>
    <input ref={imageRef} type='file' accept='image/*' className='hidden' onChange={e=>chooseBackground(e.target.files?.[0])}/>
    {background && <div className='flex items-center justify-between text-xs text-emerald-700'><span>Fotoğraf arka plan olarak ayarlandı</span><button onClick={()=>setBackground('')} className='flex items-center gap-1 text-rose-600'><X size={14}/> Kaldır</button></div>}
    <div className='flex items-center justify-between text-xs'><label htmlFor='bg-opacity' className='flex items-center gap-2'><SlidersHorizontal size={15}/> Fotoğraf opaklığı</label><b>{opacity}%</b></div>
    <input id='bg-opacity' type='range' min='5' max='100' value={opacity} onChange={e=>setOpacity(Number(e.target.value))} className='w-full accent-indigo-600'/>
   </div>
   <label className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-3 gap-3'><span className='flex items-center gap-2 text-xs font-semibold'><Smartphone size={16}/> Widget arka planını şeffaf yap</span><input type='checkbox' checked={transparentWidget} onChange={e=>setTransparentWidget(e.target.checked)} className='h-5 w-5 accent-indigo-600'/></label>
  </section>
 </section>;
}
