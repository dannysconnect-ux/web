import React from 'react';
import { ChevronDown, Loader2, AlertTriangle } from 'lucide-react';

export const GradeSubjectFields = ({ 
  formData, 
  setFormData, 
  loadingSubjects, 
  subjectOptions, 
  gradeWarning,
  type 
}: any) => {
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFormData({ ...formData, grade: e.target.value });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col relative">
          <label className="block text-sm font-bold text-slate-700 mb-1">Grade / Class</label>
          <div className="relative">
            <select 
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none"
                value={formData.grade}
                onChange={handleGradeChange}
            >
                <option value="">-- Select Level --</option>
                <optgroup label="Junior Secondary (Forms)">
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                    <option value="Form 5">Form 5</option>
                </optgroup>
                <optgroup label="Senior Secondary (Grades)">
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                </optgroup>
                <optgroup label="Primary (Grades)">
                    <option value="PreSchool">Pre-School</option>
                    <option value="Reception">Reception</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
          {loadingSubjects ? (
             <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading...
             </div>
          ) : subjectOptions.length > 0 ? (
              <div className="relative">
                <select 
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value, lessonTitle: '', topic: '', topics: []})}
                >
                    <option value="">-- Select Subject --</option>
                    {subjectOptions.map((sub: string, idx: number) => (
                        <option key={idx} value={sub}>{sub}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
              </div>
          ) : (
              <input 
                type="text" 
                placeholder={formData.grade ? "Type subject..." : "Select Grade first"}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none placeholder:text-slate-400"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value, lessonTitle: '', topic: '', topics: []})}
              />
          )}
        </div>
      </div>

      {gradeWarning && type !== 'catchup' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm font-medium">{gradeWarning}</p>
        </div>
      )}
    </>
  );
};