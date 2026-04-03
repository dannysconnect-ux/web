import React from 'react';
import { Users, ChevronDown } from 'lucide-react';

export const LogisticsFields = ({ 
  type, 
  formData, 
  setFormData,
  showTerm,
  showDate,
  showWeekNum,
  showWeeks,
  showDays,
  showLogistics
}: any) => {

  // Internal helper for numeric validation
  const handleNumberInput = (field: string, value: string, max: number) => {
    if (value === '') { setFormData({ ...formData, [field]: '' }); return; }
    const num = parseInt(value);
    if (!isNaN(num) && num <= max) { setFormData({ ...formData, [field]: num }); }
  };

  return (
    <div className="space-y-4">
      {/* Year & Term Row */}
      {showTerm && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Academic Year</label>
            <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                value={formData.year || new Date().getFullYear()} 
                onChange={(e) => setFormData({...formData, year: e.target.value})}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Term</label>
            <select 
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                value={formData.term}
                onChange={(e) => setFormData({...formData, term: e.target.value})}
            >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Week & Date Row */}
      <div className="grid grid-cols-2 gap-4">
        {showWeekNum && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Week Number</label>
            <input 
                type="number" inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                placeholder="e.g. 1"
                value={formData.weekNumber || ''}
                onChange={(e) => handleNumberInput('weekNumber', e.target.value, 15)}
            />
          </div>
        )}
        {showDate && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
            <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
          </div>
        )}
      </div>

      {/* Scheme Specific: Total Weeks */}
      {showWeeks && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Total Weeks (Max 20)</label>
          <input 
            type="number" inputMode="numeric"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
            placeholder="e.g. 13" min={1} max={20}
            value={formData.weeks || ''}
            onChange={(e) => handleNumberInput('weeks', e.target.value, 20)}
          />
        </div>
      )}

      {/* Weekly Record Specific: Days/Week */}
      {showDays && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Days / Week (Max 5)</label>
          <input 
            type="number" inputMode="numeric" max={5}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
            placeholder="e.g. 5"
            value={formData.days || ''}
            onChange={(e) => handleNumberInput('days', e.target.value, 5)}
          />
        </div>
      )}

      {/* Lesson Specific: Enrolment & Timing */}
      {showLogistics && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
            <Users size={16} className="text-slate-500" /> Enrolment & Timing
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Boys</label>
              <input 
                type="number" inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                placeholder="0" value={formData.boys || ''}
                onChange={(e) => handleNumberInput('boys', e.target.value, 100)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Girls</label>
              <input 
                type="number" inputMode="numeric"
                className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                placeholder="0" value={formData.girls || ''}
                onChange={(e) => handleNumberInput('girls', e.target.value, 100)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};