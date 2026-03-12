import { 
  ArrowLeft, CloudUpload, Printer, Loader2, BookOpen,
  Lock, Unlock, Settings2, CheckCircle2 
} from 'lucide-react';

interface LessonPlanHeaderProps {
  schoolName: string;
  subject: string;
  generatingNotes: boolean;
  hasNotes: boolean;
  isLocked: boolean;
  saving: boolean;
  saveSuccess: boolean;
  isRemedial?: boolean; // 👈 NEW: Added optional remedial flag
  onBack: () => void;
  onGenerateNotes: () => void;
  onOpenColumnModal: () => void;
  onToggleLock: () => void;
  onSave: () => void;
  onPrint: () => void;
}

export default function LessonPlanHeader({
  schoolName, subject, generatingNotes, hasNotes, isLocked, saving, saveSuccess, isRemedial,
  onBack, onGenerateNotes, onOpenColumnModal, onToggleLock, onSave, onPrint
}: LessonPlanHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 sticky top-0 z-20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm print:hidden">
      <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex items-center gap-3">
            <div>
              <h1 className="font-bold text-slate-800 leading-tight text-base sm:text-lg truncate flex items-center gap-2">
                Lesson Plan Preview 
                {/* 👈 NEW: Shows the Remedial Badge if true */}
                {isRemedial && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Remedial</span>}
              </h1>
              <p className="text-xs text-slate-500 truncate">{schoolName} • {subject}</p>
            </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
         <button 
              onClick={onGenerateNotes} 
              disabled={generatingNotes || hasNotes}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  hasNotes 
                  ? "bg-green-100 border-green-300 text-green-700" 
                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              }`}
          >
          {generatingNotes ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
          <span className="hidden sm:inline">{generatingNotes ? "Generating Notes..." : hasNotes ? "Notes Added" : "Generate Notes"}</span>
          <span className="sm:hidden">{hasNotes ? "Notes" : "Notes"}</span>
        </button>

        <button 
          onClick={onOpenColumnModal}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-medium text-xs sm:text-sm"
        >
          <Settings2 size={16} />
          <span className="hidden sm:inline">Columns</span>
        </button>

        <button 
          onClick={onToggleLock} 
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border ${
            isLocked ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          <span className="hidden xl:inline">{isLocked ? "Locked" : "Template"}</span>
        </button>

        <button onClick={onSave} disabled={saving || saveSuccess} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors text-xs sm:text-sm">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} className="text-green-600"/> : <CloudUpload size={16} />}
          <span className="hidden sm:inline">{saving ? "Saving..." : saveSuccess ? "Saved" : "Save"}</span>
        </button>
        
        <button onClick={onPrint} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 shadow-md transition-colors text-xs sm:text-sm">
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}