import React from 'react';
import { Layers, Sparkles, ChevronDown } from 'lucide-react';

export const CatchupFields = ({ formData, setFormData, availableLevels, availableActivities }: any) => {
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="relative">
        <label className="block text-sm font-bold text-slate-700 mb-1">Select Catch-up Level</label>
        <div className="relative">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 outline-none focus:ring-2 focus:ring-orange-400"
            value={formData.catchupLevel || ''}
            onChange={(e) => setFormData({...formData, catchupLevel: e.target.value})}
          >
            <option value="">-- Select Level --</option>
            {availableLevels?.map((lvl: string) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Focus Activity / Sub-topic</label>
        <div className="relative">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 outline-none focus:ring-2 focus:ring-orange-400"
            value={formData.lessonTitle || ''}
            onChange={(e) => setFormData({...formData, lessonTitle: e.target.value, subtopic: e.target.value})}
          >
            <option value="">-- Choose Activity --</option>
            {availableActivities?.map((act: any, idx: number) => (
              <option key={idx} value={act.title || act}>{act.title || act}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};