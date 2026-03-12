import { Layers, BookOpen, Calendar, ClipboardCheck, FileQuestion, Sparkles } from 'lucide-react';

export type ModalType = 'scheme' | 'lesson' | 'weekly' | 'record' | 'exam' | 'catchup' | null;

export const MODAL_CONFIG = {
  scheme: {
    title: "New Scheme of Work",
    desc: "Generate a termly or yearly curriculum breakdown.",
    icon: <Layers size={18} />,
    color: "bg-emerald-600 hover:bg-emerald-500",
    btnText: "Generate Scheme"
  },
  lesson: {
    title: "New Lesson Plan",
    desc: "Create a detailed lesson from your Weekly Plan.",
    icon: <BookOpen size={18} />,
    color: "bg-blue-600 hover:bg-blue-500",
    btnText: "Generate Lesson"
  },
  weekly: {
    title: "New Weekly Forecast",
    desc: "Auto-generate daily plans from your Scheme of Work.",
    icon: <Calendar size={18} />,
    color: "bg-purple-600 hover:bg-purple-500",
    btnText: "Generate Forecast"
  },
  record: {
    title: "New Record of Work",
    desc: "Track daily progress, methods, and evaluations.",
    icon: <ClipboardCheck size={18} />,
    color: "bg-orange-600 hover:bg-orange-500",
    btnText: "Create Record"
  },
  exam: {
    title: "New Exam Assistant",
    desc: "Generate local syllabus-aligned assessments.",
    icon: <FileQuestion size={18} />,
    color: "bg-rose-600 hover:bg-rose-500",
    btnText: "Generate Exam"
  },
  // 🆕 ADDED CATCH-UP CONFIGURATION
  catchup: {
    title: "Catch-Up Assistant",
    desc: "Generate foundational literacy and numeracy (TaRL) activities.",
    icon: <Sparkles size={18} />,
    color: "bg-amber-600 hover:bg-amber-500",
    btnText: "Generate Catch-Up Plan"
  }
};