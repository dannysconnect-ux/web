import React from 'react';
import { FileQuestion } from 'lucide-react';

const EXAM_QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'true_false', label: 'True / False' },
  { id: 'matching', label: 'Matching Pairs' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'computational', label: 'Problem Solving' },
  { id: 'essay', label: 'Essay / Open' }
];

export const ExamFields = ({ formData, setFormData }: any) => {
  const updateConfig = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setFormData({
      ...formData,
      examConfig: { ...(formData.examConfig || {}), [id]: num }
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95">
      <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
        <FileQuestion size={18} className="text-blue-500" />
        Question Mix Configuration
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {EXAM_QUESTION_TYPES.map(q => (
          <div key={q.id} className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">{q.label}</label>
            <input 
              type="number" 
              min="0"
              max="50"
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-400"
              value={formData.examConfig?.[q.id] || 0}
              onChange={(e) => updateConfig(q.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-4 italic">
        * AI will generate a balanced exam based on these counts.
      </p>
    </div>
  );
};