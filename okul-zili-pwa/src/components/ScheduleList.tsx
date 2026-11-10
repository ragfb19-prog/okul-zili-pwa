import React, { useState } from 'react';
import { BookOpen, Coffee, Utensils, Edit3, StickyNote, Check, X, Sparkles } from 'lucide-react';
import { ScheduleItem } from '../types';

interface Props {
  items: ScheduleItem[];
  isToday: boolean;
  currentHM: string;
  onUpdateItem: (id: number, title: string, notes: string) => void;
}

export const ScheduleList: React.FC<Props> = ({
  items,
  isToday,
  currentHM,
  onUpdateItem,
}) => {
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleStartEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    onUpdateItem(editingItem.id, editTitle.trim() || editingItem.title, editNotes.trim());
    setEditingItem(null);
  };

  const popularSubjects = [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'Sosyal Bilgiler',
    'İngilizce',
    'Din Kültürü',
    'Beden Eğitimi',
    'Görsel Sanatlar',
    'Müzik',
    'Bilişim',
  ];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const isLesson = item.type === 'ders';
          const isLunch = item.type === 'ogle';
          const isActive = isToday && currentHM >= item.start && currentHM < item.end;

          let badgeBg = isLesson
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : isLunch
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-3.5 sm:p-4 ${
                isActive
                  ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-500/20 bg-indigo-50/20'
                  : 'border-slate-200/90 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                    {isLesson ? (
                      <BookOpen className="w-5 h-5" />
                    ) : isLunch ? (
                      <Utensils className="w-5 h-5" />
                    ) : (
                      <Coffee className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        {item.title}
                      </h3>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                          ŞU AN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span className="font-semibold text-slate-700">{item.start} - {item.end}</span>
                      <span className="text-[10px] font-sans px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                        {item.duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Düzenleme Butonu (Sadece dersler için) */}
                {isLesson && (
                  <button
                    onClick={() => handleStartEdit(item)}
                    title="Dersi Düzenle"
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition shrink-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Not Alanı */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-2">
                <StickyNote className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p
                  onClick={() => isLesson && handleStartEdit(item)}
                  className={`text-xs leading-relaxed cursor-pointer ${
                    !item.notes
                      ? 'italic text-slate-400 hover:text-slate-600'
                      : 'font-medium text-slate-700 hover:text-indigo-600'
                  }`}
                >
                  {item.notes || (isLesson ? 'Not veya ödev eklemek için dokunun (veya telefondan söyleyin).' : 'Dinlenme aralığı.')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Düzenleme Modalı */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Dersi Düzenle</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ders Adı
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Örn: Matematik"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Hızlı Ders Seçimi */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hızlı Seç:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularSubjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setEditTitle(sub)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        editTitle === sub
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Not / Ödev / Hatırlatıcı
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Örn: Sayfa 42 ödevi teslim edilecek, cetvel getirilecek..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
