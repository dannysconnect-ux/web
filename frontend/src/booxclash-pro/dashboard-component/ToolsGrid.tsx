import { BookOpen, Calendar, Layers, ClipboardCheck, Plus, Sparkles, FileQuestion, GraduationCap } from 'lucide-react';

interface ToolsGridProps {
  onOpenModal: (type: any) => void;
  hasSchoolId: boolean;
  onNavigateSBA: () => void;
}

export const ToolsGrid = ({ onOpenModal, hasSchoolId, onNavigateSBA }: ToolsGridProps) => {
  const tools = [
    {
      title: "Schemes of Work",
      desc: "Generate termly or yearly curriculum breakdowns.",
      icon: <Layers size={28} className="text-[#6c2dc7]" />,
      color: "bg-white border-slate-200 hover:border-[#6c2dc7]/30 hover:shadow-[0_8px_30px_rgba(108,45,199,0.12)]",
      glow: "bg-[#6c2dc7]/10",
      iconBox: "bg-[#6c2dc7]/10 border-[#6c2dc7]/20",
      actionText: "text-[#6c2dc7]",
      action: () => onOpenModal('scheme') 
    },
    {
      title: "Lesson Plans",
      desc: "Create detailed step-by-step guides.",
      icon: <BookOpen size={28} className="text-[#ffa500]" />,
      color: "bg-white border-slate-200 hover:border-[#ffa500]/40 hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)]",
      glow: "bg-[#ffa500]/15",
      iconBox: "bg-[#ffa500]/10 border-[#ffa500]/20",
      actionText: "text-[#ffa500]",
      action: () => onOpenModal('lesson')
    },
    {
      title: "Weekly Forecasts",
      desc: "Plan your week's topics and objectives.",
      icon: <Calendar size={28} className="text-[#6c2dc7]" />,
      color: "bg-white border-slate-200 hover:border-[#6c2dc7]/30 hover:shadow-[0_8px_30px_rgba(108,45,199,0.12)]",
      glow: "bg-[#6c2dc7]/10",
      iconBox: "bg-[#6c2dc7]/10 border-[#6c2dc7]/20",
      actionText: "text-[#6c2dc7]",
      action: () => onOpenModal('weekly')
    },
    {
      title: "Record of Work",
      desc: "Track daily progress and evaluations.",
      icon: <ClipboardCheck size={28} className="text-[#ffa500]" />,
      color: "bg-white border-slate-200 hover:border-[#ffa500]/40 hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)]",
      glow: "bg-[#ffa500]/15",
      iconBox: "bg-[#ffa500]/10 border-[#ffa500]/20",
      actionText: "text-[#ffa500]",
      action: () => onOpenModal('record')
    },
    {
      title: "Exam Assistant",
      desc: "Generate local syllabus-aligned assessments.",
      icon: <FileQuestion size={28} className="text-[#6c2dc7]" />,
      color: "bg-white border-slate-200 hover:border-[#6c2dc7]/30 hover:shadow-[0_8px_30px_rgba(108,45,199,0.12)]",
      glow: "bg-[#6c2dc7]/10",
      iconBox: "bg-[#6c2dc7]/10 border-[#6c2dc7]/20",
      actionText: "text-[#6c2dc7]",
      action: () => onOpenModal('exam')
    },
    // 🆕 CATCH-UP ASSISTANT TOOL
    {
      title: "Catch-Up Assistant",
      desc: "Foundational Literacy & Numeracy (TaRL) plans.",
      icon: <Sparkles size={28} className="text-[#ffa500]" />,
      color: "bg-white border-slate-200 hover:border-[#ffa500]/40 hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)]",
      glow: "bg-[#ffa500]/15",
      iconBox: "bg-[#ffa500]/10 border-[#ffa500]/20",
      actionText: "text-[#ffa500]",
      action: () => onOpenModal('catchup')
    }
  ];

  // SBA tool conditionally added if they have a school ID
  if (hasSchoolId) {
    tools.push({
      title: "SBA Manager",
      desc: "Join classes & generate AI rubrics.",
      icon: <GraduationCap size={28} className="text-[#6c2dc7]" />,
      color: "bg-white border-slate-200 hover:border-[#6c2dc7]/30 hover:shadow-[0_8px_30px_rgba(108,45,199,0.12)]",
      glow: "bg-[#6c2dc7]/10",
      iconBox: "bg-[#6c2dc7]/10 border-[#6c2dc7]/20",
      actionText: "text-[#6c2dc7]",
      action: onNavigateSBA 
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
      {tools.map((tool, idx) => (
        <button 
          key={idx} 
          onClick={tool.action} 
          className={`group text-left p-6 sm:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-sm hover:-translate-y-1 ${tool.color}`}
        >
          {/* Subtle brand-colored glow on hover */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${tool.glow}`} />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className={`mb-6 w-fit p-3.5 rounded-2xl border ${tool.iconBox}`}>
              {tool.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:translate-x-1 transition-transform tracking-tight">{tool.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{tool.desc}</p>
            </div>
            <div className={`mt-6 flex items-center gap-2 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 ${tool.actionText}`}>
              {tool.title === "SBA Manager" ? "Open Dashboard" : "Create New"} <Plus size={16} strokeWidth={2.5} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};