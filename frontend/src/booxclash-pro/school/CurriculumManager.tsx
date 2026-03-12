import { FileText, CloudUpload, Lock } from 'lucide-react';

export default function CurriculumManager() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
        <FileText size={40} />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Custom Syllabus Template</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
        Upload your school's specific lesson plan structure (PDF or Word). 
        The AI will analyze it and auto-generate input forms matching your exact format.
      </p>
      
      <div className="w-full max-w-lg border-2 border-dashed border-slate-300 rounded-2xl p-10 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer group">
        <CloudUpload size={32} className="mx-auto text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
        <p className="font-bold text-slate-600 group-hover:text-indigo-700">Click to upload PDF</p>
        <p className="text-xs text-slate-400 mt-1">Max file size 5MB</p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 py-2 px-4 rounded-full">
         <Lock size={12} /> Secure & Private Processing
      </div>
    </div>
  );
}