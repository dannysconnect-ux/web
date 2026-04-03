import React from 'react';
import { Book, Loader2, CheckCircle2 } from 'lucide-react';

export const SyllabusBrowser = ({ structure, loading, formData, setFormData }: any) => {
  const toggleTopic = (topicTitle: string) => {
    const current = formData.topics || [];
    const exists = current.includes(topicTitle);
    
    if (exists) {
      setFormData({ ...formData, topics: current.filter((t: string) => t !== topicTitle) });
    } else {
      setFormData({ ...formData, topics: [...current, topicTitle] });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Loader2 className="animate-spin text-slate-400 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Loading Official Syllabus...</p>
      </div>
    );
  }

  if (!structure || structure.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
        <Book size={16} className="text-indigo-500" />
        Select Topics to Include in Scheme
      </label>
      
      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-1 scrollbar-thin">
        {structure.map((item: any, idx: number) => {
          const title = item.title || item.topic || `Unit ${idx + 1}`;
          const isSelected = formData.topics?.includes(title);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleTopic(title)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                isSelected 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-sm font-medium">{title}</span>
              {isSelected && <CheckCircle2 size={16} className="text-indigo-500" />}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        Tip: Select multiple topics to generate a comprehensive scheme for the term.
      </p>
    </div>
  );
};