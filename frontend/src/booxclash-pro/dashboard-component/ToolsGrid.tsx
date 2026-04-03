import { 
  BookOpen, 
  Calendar, 
  Layers, 
  ClipboardCheck, 
  Sparkles, 
  FileQuestion, 
  GraduationCap, 
  Award, 
  ClipboardList, 
  Library 
} from 'lucide-react';

interface ToolsGridProps {
  onOpenModal: (type: any) => void;
  hasSchoolId: boolean; // Kept in interface so the parent component doesn't break
  onNavigateSBA: () => void;
}

export const ToolsGrid = ({ onOpenModal, onNavigateSBA }: ToolsGridProps) => {
  // We removed 'desc' to maintain a clean OS app look, but increased the icon sizes to 36!
  // Alternating between Purple and Orange themes
  const tools = [
    {
      title: "Schemes of Work",
      icon: <Layers size={36} className="text-[#6c2dc7]" />,
      color: "hover:shadow-[0_12px_30px_rgba(108,45,199,0.2)]",
      iconBox: "bg-gradient-to-br from-white to-[#6c2dc7]/10 border border-[#6c2dc7]/20",
      action: () => onOpenModal('scheme') 
    },
    {
      title: "Lesson Plans",
      icon: <BookOpen size={36} className="text-[#ffa500]" />,
      color: "hover:shadow-[0_12px_30px_rgba(255,165,0,0.25)]",
      iconBox: "bg-gradient-to-br from-white to-[#ffa500]/15 border border-[#ffa500]/20",
      action: () => onOpenModal('lesson')
    },
    {
      title: "Weekly Forecasts",
      icon: <Calendar size={36} className="text-[#6c2dc7]" />,
      color: "hover:shadow-[0_12px_30px_rgba(108,45,199,0.2)]",
      iconBox: "bg-gradient-to-br from-white to-[#6c2dc7]/10 border border-[#6c2dc7]/20",
      action: () => onOpenModal('weekly')
    },
    {
      title: "Record of Work",
      icon: <ClipboardCheck size={36} className="text-[#ffa500]" />,
      color: "hover:shadow-[0_12px_30px_rgba(255,165,0,0.25)]",
      iconBox: "bg-gradient-to-br from-white to-[#ffa500]/15 border border-[#ffa500]/20",
      action: () => onOpenModal('record')
    },
    {
      title: "Exam Assistant",
      icon: <FileQuestion size={36} className="text-[#6c2dc7]" />,
      color: "hover:shadow-[0_12px_30px_rgba(108,45,199,0.2)]",
      iconBox: "bg-gradient-to-br from-white to-[#6c2dc7]/10 border border-[#6c2dc7]/20",
      action: () => onOpenModal('exam')
    },
    {
      title: "Catch-Up",
      icon: <Sparkles size={36} className="text-[#ffa500]" />,
      color: "hover:shadow-[0_12px_30px_rgba(255,165,0,0.25)]",
      iconBox: "bg-gradient-to-br from-white to-[#ffa500]/15 border border-[#ffa500]/20",
      action: () => onOpenModal('catchup')
    },
    {
      title: "SBA Manager",
      icon: <GraduationCap size={36} className="text-[#6c2dc7]" />,
      color: "hover:shadow-[0_12px_30px_rgba(108,45,199,0.2)]",
      iconBox: "bg-gradient-to-br from-white to-[#6c2dc7]/10 border border-[#6c2dc7]/20",
      action: onNavigateSBA 
    },
    {
      title: "Report Cards Assistant",
      icon: <Award size={36} className="text-[#ffa500]" />,
      color: "hover:shadow-[0_12px_30px_rgba(255,165,0,0.25)]",
      iconBox: "bg-gradient-to-br from-white to-[#ffa500]/15 border border-[#ffa500]/20",
      action: () => onOpenModal('report')
    },
    {
      title: "Attendance Register Assistant",
      icon: <ClipboardList size={36} className="text-[#6c2dc7]" />,
      color: "hover:shadow-[0_12px_30px_rgba(108,45,199,0.2)]",
      iconBox: "bg-gradient-to-br from-white to-[#6c2dc7]/10 border border-[#6c2dc7]/20",
      action: () => onOpenModal('attendance')
    },
    {
      title: "Courses",
      icon: <Library size={36} className="text-[#ffa500]" />,
      color: "hover:shadow-[0_12px_30px_rgba(255,165,0,0.25)]",
      iconBox: "bg-gradient-to-br from-white to-[#ffa500]/15 border border-[#ffa500]/20",
      action: () => onOpenModal('courses')
    }
  ];

  return (
    // Updated grid to support an "app drawer" style (more columns, tighter gaps)
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-10 max-w-5xl mx-auto px-4 py-8">
      {tools.map((tool, idx) => (
        <button 
          key={idx} 
          onClick={tool.action} 
          className="group flex flex-col items-center outline-none transition-all duration-300"
        >
          {/* App Icon Container (Squircle) */}
          <div className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] sm:rounded-3xl shadow-sm transition-all duration-300 group-hover:-translate-y-2 group-active:scale-95 ${tool.iconBox} ${tool.color}`}>
            
            {/* Glossy Reflection Effect (Makes it look like a real OS icon!) */}
            <div className="absolute inset-0 bg-white/30 rounded-[22px] sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)' }} />
            
            {tool.icon}
          </div>
          
          {/* App Title */}
          <span className="mt-3 text-sm sm:text-base font-semibold text-slate-700 group-hover:text-slate-900 text-center tracking-tight px-2 leading-tight drop-shadow-sm">
            {tool.title}
          </span>
        </button>
      ))}
    </div>
  );
};