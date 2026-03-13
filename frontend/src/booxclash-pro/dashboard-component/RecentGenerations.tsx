import { 
  Calendar, BookOpen, Layers, ClipboardCheck, 
  ChevronRight, Loader2, Clock, Edit3, 
  Sparkles, FileQuestion 
} from 'lucide-react';

interface RecentProps {
  docs: any[];
  loading: boolean;
  filter: string;
  setFilter: (f: any) => void;
  onOpen: (doc: any) => void;
}

export const RecentGenerations = ({ docs, loading, filter, setFilter, onOpen }: RecentProps) => {
  // 1. Unified Icon Logic
  const getDocIcon = (type: string) => {
    if (type === 'weekly') return <Calendar size={20} />;
    if (type === 'lesson') return <BookOpen size={20} />;
    if (type === 'record') return <ClipboardCheck size={20} />;
    if (type === 'exam') return <FileQuestion size={20} />;
    if (type === 'catchup') return <Sparkles size={20} />;
    return <Layers size={20} />; // default to Scheme
  };

  // 2. Strict Brand Color Mapping
  const getDocColor = (type: string) => {
    // Alternating between your brand Orange and Purple for subtle variety
    if (['weekly', 'record', 'catchup'].includes(type)) {
      return 'bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/20';
    }
    return 'bg-[#6c2dc7]/10 text-[#6c2dc7] border border-[#6c2dc7]/20';
  };

  const filteredDocs = filter === 'all' ? docs : docs.filter(d => d.type === filter);
  
  // Added exam and catchup to the available filters
  const filterOptions = ['all', 'scheme', 'lesson', 'weekly', 'record', 'exam', 'catchup'];

  return (
    <div className="mt-12 max-w-6xl mx-auto pb-10 selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <Clock size={18} className="text-[#6c2dc7]" /> Recent Generations
        </h2>
        
        {/* Sleek Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
           {filterOptions.map(f => (
             <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${
                    filter === f 
                    ? 'bg-[#6c2dc7] text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-[#6c2dc7]/30 hover:bg-[#6c2dc7]/5 hover:text-[#6c2dc7]'
                }`}
             >
               {f === 'catchup' ? 'Catch-Up' : f}
             </button>
           ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-[#ffa500]" size={32} />
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => {
            // Check all possible "edited" flags
            const isEdited = doc.updatedAt || doc.is_human_verified || doc.captured_at;

            return (
              <button 
                  key={doc.id} 
                  onClick={() => onOpen(doc)} 
                  className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl hover:border-[#6c2dc7]/30 hover:shadow-[0_4px_20px_rgba(108,45,199,0.08)] transition-all group text-left shadow-sm hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getDocColor(doc.type)}`}>
                      {getDocIcon(doc.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {doc.subject}
                        
                        {/* Styled Edited Badge */}
                        {isEdited && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/20 uppercase tracking-widest">
                                <Edit3 size={10} strokeWidth={2.5} /> Edited
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 capitalize mt-1 font-medium">
                        {doc.type === 'weekly' ? 'Weekly Forecast' : doc.type === 'catchup' ? 'Catch-Up Plan' : doc.type} • {doc.grade} 
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ffa500] group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl bg-white/50 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">No recent documents found for this category.</p>
        </div>
      )}
    </div>
  );
};