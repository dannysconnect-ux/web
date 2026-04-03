import { 
  Calendar, BookOpen, Layers, ClipboardCheck, 
  ChevronRight, Loader2, Edit3, Sparkles, FileQuestion, 
  Folder, ChevronLeft, CheckCircle2, Clock 
} from 'lucide-react';

interface RecentProps {
  docs: any[];
  loading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  onOpen: (doc: any) => void;
}

export const RecentGenerations = ({ docs, loading, filter, setFilter, onOpen }: RecentProps) => {
  
  // 1. Unified Icon Logic for Files
  const getDocIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('weekly')) return <Calendar size={20} />;
    if (t.includes('lesson')) return <BookOpen size={20} />;
    if (t.includes('record')) return <ClipboardCheck size={20} />;
    if (t.includes('exam')) return <FileQuestion size={20} />;
    if (t.includes('catchup')) return <Sparkles size={20} />;
    return <Layers size={20} />; // default to Scheme
  };

  // 2. Strict Brand Color Mapping for Files
  const getDocColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('weekly') || t.includes('record') || t.includes('catchup')) {
      return 'bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/20';
    }
    return 'bg-[#6c2dc7]/10 text-[#6c2dc7] border border-[#6c2dc7]/20';
  };

  // 3. Robust Type Normalizer (Handles database variations like "Lesson Plan", "lesson", "Remedial Lesson Plan")
  const getNormalizedType = (rawType: string) => {
    const t = (rawType || "").toLowerCase();
    if (t.includes('lesson')) return 'lesson';
    if (t.includes('scheme')) return 'scheme';
    if (t.includes('weekly')) return 'weekly';
    if (t.includes('record')) return 'record';
    if (t.includes('exam')) return 'exam';
    if (t.includes('catchup')) return 'catchup';
    return 'scheme'; // fallback
  };

  // 4. Folder Definitions
  const folders = [
    { id: 'scheme', label: 'Schemes of Work', icon: <Layers size={18} className="text-white" />, color: 'fill-[#6c2dc7]/20 text-[#6c2dc7]' },
    { id: 'lesson', label: 'Lesson Plans', icon: <BookOpen size={18} className="text-white" />, color: 'fill-[#ffa500]/20 text-[#ffa500]' },
    { id: 'weekly', label: 'Weekly Forecasts', icon: <Calendar size={18} className="text-white" />, color: 'fill-[#6c2dc7]/20 text-[#6c2dc7]' },
    { id: 'record', label: 'Records of Work', icon: <ClipboardCheck size={18} className="text-white" />, color: 'fill-[#ffa500]/20 text-[#ffa500]' },
    { id: 'exam', label: 'Exams', icon: <FileQuestion size={18} className="text-white" />, color: 'fill-[#6c2dc7]/20 text-[#6c2dc7]' },
    { id: 'catchup', label: 'Catch-Up Plans', icon: <Sparkles size={18} className="text-white" />, color: 'fill-[#ffa500]/20 text-[#ffa500]' }
  ];

  const getDocCount = (folderId: string) => docs.filter(d => getNormalizedType(d.type) === folderId).length;
  
  const filteredDocs = filter === 'all' 
    ? docs 
    : docs.filter(d => getNormalizedType(d.type) === filter);

  const activeFolder = folders.find(f => f.id === filter);

  return (
    <div className="mt-12 max-w-5xl mx-auto pb-10 selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7] px-4 sm:px-0">
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between mb-6">
        {filter === 'all' ? (
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
            <Folder size={24} className="text-[#6c2dc7] fill-[#6c2dc7]/20" /> My Files
          </h2>
        ) : (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setFilter('all')}
              className="p-2.5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
            >
              <ChevronLeft size={20} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Folder size={24} className="text-[#ffa500] fill-[#ffa500]/20" /> 
              {activeFolder?.label}
            </h2>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center p-16">
            <Loader2 className="animate-spin text-[#ffa500]" size={40} />
        </div>
      ) : filter === 'all' ? (
        
        /* 📂 FOLDER VIEW (Grid of OS-like Folders) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {folders.map(folder => {
            const count = getDocCount(folder.id);
            return (
              <button
                key={folder.id}
                onClick={() => setFilter(folder.id)}
                className="flex flex-col items-center justify-center p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-[#6c2dc7]/30 transition-all duration-300 group active:scale-95 outline-none"
              >
                <div className="relative mb-3">
                  <Folder size={64} strokeWidth={1} className={`${folder.color} group-hover:scale-110 transition-transform duration-300 drop-shadow-sm`} />
                  <div className="absolute inset-0 flex items-center justify-center mt-2.5 opacity-90">
                     {folder.icon}
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] text-center leading-tight tracking-tight">{folder.label}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                  {count} {count === 1 ? 'Item' : 'Items'}
                </p>
              </button>
            );
          })}
        </div>

      ) : (

        /* 📄 FILE VIEW (Inside a specific folder) */
        filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredDocs.map((doc) => {
              const isEdited = doc.updatedAt || doc.is_human_verified || doc.captured_at;
              const normalizedType = getNormalizedType(doc.type);
              
              // 🚨 Check Evaluation Status for Lesson Plans
              const isLesson = normalizedType === 'lesson';
              const isEvaluated = doc.isEvaluated === true || 
                                  doc.evaluation_status === 'success' || 
                                  doc.evaluation_status === 'needs_remedial' || 
                                  doc.evaluation_status === 'failed';

              return (
                <button 
                  key={doc.id} 
                  onClick={() => onOpen(doc)} 
                  className="flex items-center justify-between bg-white border border-slate-200 p-5 rounded-2xl hover:border-[#6c2dc7]/30 hover:shadow-[0_8px_25px_rgba(108,45,199,0.08)] transition-all duration-300 group text-left shadow-sm active:scale-[0.98] outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-xl shadow-sm ${getDocColor(doc.type)}`}>
                        {getDocIcon(normalizedType)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex flex-wrap items-center gap-2 text-[15px]">
                          {doc.subject || doc.title || "Untitled Document"}
                          
                          {/* Styled Edited Badge */}
                          {isEdited && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/20 uppercase tracking-widest">
                                  <Edit3 size={10} strokeWidth={2.5} /> Edited
                              </span>
                          )}

                          {/* 🚨 EVALUATION STATUS BADGE (Only for Lesson Plans) */}
                          {isLesson && (
                            isEvaluated ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase tracking-widest">
                                  <CheckCircle2 size={10} strokeWidth={2.5} /> Evaluated
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-orange-100 text-orange-600 border border-orange-200 uppercase tracking-widest">
                                  <Clock size={10} strokeWidth={2.5} /> Pending Evaluation
                              </span>
                            )
                          )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                          {doc.grade || 'General'} • {doc.date || (doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : "Recent")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ffa500] group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-slate-300 rounded-3xl bg-white/50 shadow-sm animate-in zoom-in-95">
             <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Folder size={28} className="text-slate-400" />
             </div>
             <h3 className="text-lg font-bold text-slate-700">This folder is empty</h3>
             <p className="text-slate-500 text-sm mt-1">Generate a new document to see it here.</p>
          </div>
        )
      )}
    </div>
  );
};