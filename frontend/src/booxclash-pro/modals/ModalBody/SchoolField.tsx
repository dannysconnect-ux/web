import React from 'react';
import { Lock } from 'lucide-react';

export const SchoolField = ({ formData, setFormData }: any) => {
  const storedSchoolId = localStorage.getItem('schoolId');

  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">School Name</label>
      <div className="relative">
        <input 
            type="text" 
            value={formData.school || ""} 
            disabled={!!storedSchoolId} 
            className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] focus:border-[#ffa500] outline-none placeholder:text-slate-400 ${storedSchoolId ? 'pl-10 opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
            placeholder="e.g. Lusaka High School"
            onChange={(e) => setFormData({...formData, school: e.target.value})}
        />
        {storedSchoolId && (
            <Lock size={14} className="absolute left-3 top-4 text-slate-400" />
        )}
      </div>
    </div>
  );
};