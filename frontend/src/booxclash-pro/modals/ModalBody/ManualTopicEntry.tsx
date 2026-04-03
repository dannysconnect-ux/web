import React from 'react';

interface ManualTopicEntryProps {
  type: string;
  formData: any;
  setFormData: (data: any) => void;
}

export const ManualTopicEntry: React.FC<ManualTopicEntryProps> = ({ type, formData, setFormData }) => {
  const showLessonTitle = type === 'lesson' || type === 'record' || type === 'weekly';

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Topic Name</label>
        <input 
          type="text" 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none transition-all"
          placeholder="e.g. Algebra"
          value={formData.topic || ''}
          onChange={(e) => setFormData({...formData, topic: e.target.value})}
        />
      </div>

      {showLessonTitle && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Sub-topic / Lesson Title</label>
          <input 
            type="text" 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none transition-all"
            placeholder="e.g. Introduction to Linear Equations"
            value={formData.lessonTitle || ''}
            onChange={(e) => setFormData({
                ...formData, 
                lessonTitle: e.target.value, 
                subtopic: e.target.value 
            })}
          />
        </div>
      )}
    </div>
  );
};