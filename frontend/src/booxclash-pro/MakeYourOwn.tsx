import { useState } from 'react';
import { 
  CheckCircle, Calendar as CalIcon, 
  Loader2, ArrowRight, BrainCircuit, Check, LayoutTemplate,
  FileText, Sparkles, Clock, Eye, Download, FolderOpen
} from 'lucide-react';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import LessonPlan from './LessonPlan'; 

// --- CONFIG ---
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

// --- REAL SYLLABUS DATA: CAMBRIDGE IGCSE CHEMISTRY 0620 ---
const MOCK_SYLLABUS = [
  {
    id: "t1", title: "1. States of Matter",
    subtopics: [
      { id: "st1", title: "1.1 Solids, liquids and gases", outcomes: "State properties and describe structure/motion of particles", duration: "1h" },
      { id: "st2", title: "1.2 Diffusion", outcomes: "Describe and explain diffusion; dependence on mass and temperature", duration: "1h" }
    ]
  },
  {
    id: "t2", title: "2. Atoms, elements and compounds",
    subtopics: [
      { id: "st3", title: "2.1 Atomic structure", outcomes: "Define proton, nucleon number; isotopes and electronic structure", duration: "2h" },
      { id: "st4", title: "2.2 Ions and ionic bonds", outcomes: "Describe formation of ions and lattice structure", duration: "1h" },
      { id: "st5", title: "2.3 Covalent bonds", outcomes: "Describe formation of single covalent bonds and volatility", duration: "1h" }
    ]
  },
  {
    id: "t3", title: "3. Stoichiometry",
    subtopics: [
      { id: "st6", title: "3.1 Formulae", outcomes: "State and deduce formulae of ionic compounds", duration: "1h" },
      { id: "st7", title: "3.2 Relative masses", outcomes: "Define relative atomic mass (Ar) and molecular mass (Mr)", duration: "1h" }
    ]
  },
  {
    id: "t4", title: "4. Electrochemistry",
    subtopics: [
      { id: "st8", title: "4.1 Electrolysis", outcomes: "Define electrolysis, electrode products, and ionic movement", duration: "2h" }
    ]
  }
];

// --- MOCK SAVED LESSONS (THE REPOSITORY FEATURE) ---
const SAVED_LESSONS = [
    { id: 1, title: "1.1 States of Matter", date: "Just now", status: "Ready" },
    { id: 2, title: "2.1 Atomic Structure", date: "Yesterday", status: "Archived" },
    { id: 3, title: "4.1 Electrolysis Introduction", date: "Feb 05", status: "Archived" }
];

// --- CUSTOM CSS FOR DARK MODE CALENDAR ---
const calendarStyles = `
  .rbc-calendar { color: #94a3b8 !important; font-family: sans-serif; }
  .rbc-off-range-bg { background: #0f172a !important; }
  .rbc-header { border-bottom: 1px solid #334155 !important; padding: 12px !important; font-weight: 600; color: #e2e8f0; }
  .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: 1px solid #334155 !important; background: #0f172a; border-radius: 12px; overflow: hidden; }
  .rbc-day-bg { border-left: 1px solid #334155 !important; }
  .rbc-time-content { border-top: 1px solid #334155 !important; }
  .rbc-time-header-content { border-left: 1px solid #334155 !important; }
  .rbc-timeslot-group { border-bottom: 1px solid #1e293b !important; }
  .rbc-day-slot .rbc-time-slot { border-top: 1px solid #1e293b !important; }
  .rbc-today { background-color: #1e293b !important; }
  .rbc-event { background-color: #10b981 !important; border-radius: 6px !important; border: none !important; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .rbc-time-gutter .rbc-timeslot-group { border-bottom: 1px solid #1e293b !important; }
  .rbc-label { color: #64748b; font-size: 0.75rem; }
`;

export default function TeacherAgentDemo() {
  const [step, setStep] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  
  // State
  const [syllabusName, setSyllabusName] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);

  // 1. Upload Handlers
  const handleSyllabusUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) setSyllabusName(file.name);
  };

  const handleTemplateUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) setTemplateName(file.name);
  };

  const handleStartAnalysis = () => {
    setStep(2); 
    runAiSimulation();
  };

  // 2. AI Simulation (Terminal Style)
  const runAiSimulation = () => {
    const sequence = [
      "Initializing Neural Context...",
      `Ingesting Syllabus: ${syllabusName}...`,
      "Vectorizing Content Standards...",
      `Parsing Compliance Template: ${templateName || "Standard"}...`,
      "Mapping Knowledge Graph Nodes...",
      "Aligning Specific Outcomes to Duration...",
      "Generating Lesson Schemas...",
      "Optimization Complete."
    ];

    let delay = 0;
    setLogs([]);

    sequence.forEach((text, index) => {
      delay += Math.random() * 800 + 400;
      setTimeout(() => {
        setLogs(prev => [...prev, text]);
        if (index === sequence.length - 1) {
          setTimeout(() => setStep(3), 800);
        }
      }, delay);
    });
  };

  // 3. Scheduling Logic
  const handleSlotSelect = (slot: SlotInfo) => {
    setSelectedSlot(slot);
    setShowTopicPicker(true);
  };

  const handleTopicSelect = (topicTitle: string, subtopicTitle: string) => {
    if (selectedSlot) {
      const newEvent = {
        title: subtopicTitle,
        start: selectedSlot.start,
        end: selectedSlot.end,
        resource: { topic: topicTitle }
      };
      setEvents([...events, newEvent]);
      setShowTopicPicker(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30">
      <style>{calendarStyles}</style>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">
              <BrainCircuit size={18} />
            </div>
            <span className="font-bold text-white tracking-tight">Teacher<span className="text-emerald-400">AI</span>gent</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
             <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                Context
             </div>
             <div className={`flex items-center gap-2 ${step >= 3 ? 'text-white' : 'text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                Review
             </div>
             <div className={`flex items-center gap-2 ${step >= 4 ? 'text-white' : 'text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${step >= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                Deploy
             </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-5xl mx-auto p-6 mt-8">
        
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Automate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Lesson Planning</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Upload your curriculum source and your school's required format. <br/>The Agent creates the schemes and lesson plans for you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="group relative bg-slate-900/50 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="absolute top-4 right-4">
                  {syllabusName ? <CheckCircle className="text-emerald-500" /> : <span className="text-xs font-mono text-slate-500">REQUIRED</span>}
                </div>
                <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="text-emerald-400" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Syllabus / Curriculum</h3>
                <p className="text-slate-400 text-sm mb-6">Upload the PDF reference (e.g., Cambridge IGCSE, National Curriculum).</p>
                <label className="flex items-center justify-center w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors border border-white/5">
                   <span className="text-sm font-medium truncate">{syllabusName || "Select PDF Reference"}</span>
                   <input type="file" className="hidden" accept=".pdf" onChange={handleSyllabusUpload} />
                </label>
              </div>

              <div className="group relative bg-slate-900/50 border border-white/10 hover:border-cyan-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                 <div className="absolute top-4 right-4">
                  {templateName ? <CheckCircle className="text-cyan-500" /> : <span className="text-xs font-mono text-slate-500">OPTIONAL</span>}
                </div>
                <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <LayoutTemplate className="text-cyan-400" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Compliance Template</h3>
                <p className="text-slate-400 text-sm mb-6">Upload a past lesson plan or template to train the style (PDF/Doc).</p>
                <label className="flex items-center justify-center w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors border border-white/5">
                   <span className="text-sm font-medium truncate">{templateName || "Select Style Template"}</span>
                   <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleTemplateUpload} />
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleStartAnalysis}
                disabled={!syllabusName}
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-emerald-600 font-lg rounded-xl hover:bg-emerald-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                <span>Generate Agent Knowledge</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AI PROCESSING */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full"></div>
               <Loader2 size={64} className="text-emerald-400 animate-spin relative z-10" />
            </div>
            
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 font-mono text-sm p-6 shadow-2xl overflow-hidden relative">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                <span className="ml-2 text-xs text-slate-500">agent_core.ts — running</span>
              </div>
              <div className="flex flex-col gap-2 h-48 overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 fade-in duration-300">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span className={i === logs.length - 1 ? "text-emerald-400 font-bold" : "text-slate-300"}>
                      {log}
                    </span>
                  </div>
                ))}
                {logs.length > 0 && <div className="animate-pulse text-emerald-500">_</div>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW EXTRACTION */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="flex justify-between items-end mb-8">
                <div>
                   <h2 className="text-3xl font-bold text-white mb-2">Review Extracted Plan</h2>
                   <p className="text-slate-400">
                     The Agent has structured <strong>{syllabusName}</strong> into teachable units.
                   </p>
                </div>
                <button 
                  onClick={() => setStep(4)}
                  className="bg-white text-slate-900 hover:bg-slate-200 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg"
                >
                  Confirm & Schedule <ArrowRight size={18}/>
                </button>
             </div>

             <div className="grid gap-4">
               {MOCK_SYLLABUS.map((topic, idx) => (
                 <div key={topic.id} className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-all">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                       <h3 className="font-bold text-lg text-emerald-100 flex items-center gap-2">
                         <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">Module {idx + 1}</span>
                         {topic.title}
                       </h3>
                    </div>
                    <div className="p-4 grid gap-3">
                       {topic.subtopics.map(sub => (
                         <div key={sub.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="font-semibold text-white">{sub.title}</span>
                               </div>
                               <p className="text-sm text-slate-400">{sub.outcomes}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                               <div className="flex items-center gap-1"><Clock size={12}/> {sub.duration}</div>
                               <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Ready to Schedule</div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* STEP 4: CALENDAR */}
        {step === 4 && (
          <div className="animate-in fade-in duration-500 h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div>
                  <h2 className="text-2xl font-bold text-white">Teach the Agent your Routine</h2>
                  <p className="text-slate-400 text-sm">Drag or click on the calendar to assign topics. The Agent will memorize this.</p>
               </div>
               <button 
                  onClick={() => setStep(5)}
                  disabled={events.length === 0}
                  className="bg-emerald-500 text-slate-900 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Sparkles size={18}/>
                  Activate Agent
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-1 shadow-2xl backdrop-blur-sm">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                defaultView="week"
                selectable
                onSelectSlot={handleSlotSelect}
                style={{ height: 600 }}
              />
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS & REPOSITORY */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping duration-1000"></div>
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                 <Check size={48} className="text-white drop-shadow-md" />
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-2">Agent Activated</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-md text-center">
              The Agent is now monitoring your schedule.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                
                {/* 1. STATUS CARD (LIVE MONITOR) */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl h-full">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/> Live Status
                        </span>
                        <span className="text-slate-500 text-xs">ID: #8821-X</span>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex gap-4">
                            <div className="mt-1"><CalIcon className="text-slate-400" size={20}/></div>
                            <div>
                                <p className="text-sm text-slate-400">Next Scheduled Class</p>
                                <p className="text-white font-medium text-lg">Monday, 08:00 AM</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="mt-1"><BrainCircuit className="text-slate-400" size={20}/></div>
                            <div>
                                <p className="text-sm text-slate-400">Generating Content For</p>
                                <p className="text-white font-medium text-lg">1.1 States of Matter</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowPlanPreview(true)}
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Eye size={18} /> View Current Plan
                        </button>
                    </div>
                </div>

                {/* 2. REPOSITORY CARD (SAVED LESSONS) */}
                <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl h-full flex flex-col">
                    <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-blue-400 font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2">
                            <FolderOpen size={14} /> Lesson Repository
                        </span>
                        <span className="text-slate-500 text-xs">3 Files Saved</span>
                    </div>
                    <div className="p-0 flex-1 overflow-y-auto">
                        {SAVED_LESSONS.map((lesson) => (
                            <div key={lesson.id} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => setShowPlanPreview(true)}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${lesson.id === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{lesson.title}</p>
                                        <p className="text-xs text-slate-500">Generated: {lesson.date}</p>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full">
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-800/30 border-t border-slate-700 text-center">
                        <p className="text-xs text-slate-500">All generations are automatically archived here.</p>
                    </div>
                </div>

            </div>
          </div>
        )}

        {/* TOPIC PICKER */}
        {showTopicPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <div>
                   <h3 className="font-bold text-xl text-white">Select Lesson Topic</h3>
                   <p className="text-slate-400 text-xs mt-1">For slot: {selectedSlot && format(selectedSlot.start, 'EEE, MMM d, h:mm a')}</p>
                </div>
                <button onClick={() => setShowTopicPicker(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">✕</button>
              </div>
              <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {MOCK_SYLLABUS.map((topic) => (
                  <div key={topic.id}>
                    <div className="px-2 py-1 text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">
                      {topic.title}
                    </div>
                    <div className="space-y-1">
                      {topic.subtopics.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleTopicSelect(topic.title, sub.title)}
                          className="w-full text-left p-3 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 flex flex-col transition-all group"
                        >
                          <span className="font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">{sub.title}</span>
                          <span className="text-xs text-slate-500 truncate mt-1">{sub.outcomes}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL PREVIEW */}
        {showPlanPreview && (
          <LessonPlan onClose={() => setShowPlanPreview(false)} />
        )}
      </main>
    </div>
  );
}