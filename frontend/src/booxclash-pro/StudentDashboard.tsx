import React, { useState } from 'react';
import { 
  BookOpen, 
  Trophy, 
  ArrowRight, 
  GraduationCap, 
  Clock, 
  Lightbulb,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- TYPES ---
type Grade = '7' | '12' | null;
type Mode = 'study' | 'exam' | null;

const StudentDashboard: React.FC = () => {
  const [grade, setGrade] = useState<Grade>(null);
  const [mode, setMode] = useState<Mode>(null);

  const handleStart = () => {
    if (grade && mode) {
      console.log(`Starting ${mode} mode for Grade ${grade}`);
      // Here you would navigate to your actual question engine:
      // navigate(`/practice?grade=${grade}&mode=${mode}`);
      alert(`Launching ${mode === 'study' ? 'Study Mode (with Simplest Way explanations)' : 'Exam Mode (Timed Drill)'} for Grade ${grade}!`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fff0] font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <span className="font-bold text-xl tracking-tight text-[#6c2dc7]">BooxClash <span className="text-slate-400 font-medium">| Prep</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-400 uppercase">Student Account</p>
            <p className="text-sm font-semibold text-slate-700">Exam Candidate</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#ffa500] flex items-center justify-center text-white font-bold">
            S
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-black mb-4">Ready to Master Your Exams?</h1>
          <p className="text-slate-600">Select your grade and preferred study method to begin drilling.</p>
        </div>

        <div className="space-y-12">
          
          {/* STEP 1: GRADE SELECTION */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#6c2dc7] text-white flex items-center justify-center text-sm font-bold">1</div>
              <h2 className="text-xl font-bold">Choose Your Grade</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setGrade('7')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  grade === '7' 
                  ? 'border-[#6c2dc7] bg-[#6c2dc7]/5 shadow-md' 
                  : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${grade === '7' ? 'bg-[#6c2dc7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <GraduationCap size={24} />
                </div>
                <h3 className="font-bold text-lg">Grade 7</h3>
                <p className="text-sm text-slate-500 mt-1">Primary School Leaving Exam (ECZ)</p>
              </button>

              <button 
                onClick={() => setGrade('12')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  grade === '12' 
                  ? 'border-[#6c2dc7] bg-[#6c2dc7]/5 shadow-md' 
                  : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${grade === '12' ? 'bg-[#6c2dc7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Trophy size={24} />
                </div>
                <h3 className="font-bold text-lg">Grade 12</h3>
                <p className="text-sm text-slate-500 mt-1">School Certificate (ECZ / Cambridge)</p>
              </button>
            </div>
          </section>

          {/* STEP 2: MODE SELECTION */}
          <section className={!grade ? 'opacity-40 pointer-events-none' : ''}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#ffa500] text-white flex items-center justify-center text-sm font-bold">2</div>
              <h2 className="text-xl font-bold">Choose Training Mode</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* STUDY MODE */}
              <button 
                onClick={() => setMode('study')}
                className={`p-6 rounded-2xl border-2 text-left transition-all group ${
                  mode === 'study' 
                  ? 'border-[#ffa500] bg-[#ffa500]/5 shadow-md' 
                  : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'study' ? 'bg-[#ffa500] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Lightbulb size={24} />
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">MOST POPULAR</span>
                </div>
                <h3 className="font-bold text-lg">Study Mode</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">We explain complex concepts in the <span className="text-[#ffa500] font-bold">simplest way</span> before you try the question.</p>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/> Step-by-step examples</div>
                   <div className="flex items-center gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/> AI Analogy Engine</div>
                </div>
              </button>

              {/* EXAM MODE */}
              <button 
                onClick={() => setMode('exam')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  mode === 'exam' 
                  ? 'border-[#ffa500] bg-[#ffa500]/5 shadow-md' 
                  : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'exam' ? 'bg-[#ffa500] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock size={24} />
                  </div>
                </div>
                <h3 className="font-bold text-lg">Exam Mode</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Timed drills that simulate real Zambian exam standards. Pure practice, no hints.</p>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/> Countdown timer</div>
                   <div className="flex items-center gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/> Instant performance score</div>
                </div>
              </button>
            </div>
          </section>

          {/* START BUTTON */}
          <div className="pt-6">
            <button
              onClick={handleStart}
              disabled={!grade || !mode}
              className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl ${
                grade && mode 
                ? 'bg-[#6c2dc7] text-white hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Start Your Session <ArrowRight size={24} />
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              By starting, you agree to our Holiday Prep Terms of Service.
            </p>
          </div>

        </div>
      </main>

      {/* Quick Stats / Achievements Mini-bar */}
      <footer className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-[#ffa500]">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-white font-bold">Holiday Prep Progress</p>
              <p className="text-slate-400 text-xs">You have completed 0 topics this week.</p>
            </div>
          </div>
          <div className="w-full md:w-48 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-[#ffa500]" />
          </div>
          <button className="text-sm font-bold text-[#ffa500] hover:underline">View Leaderboard</button>
        </div>
      </footer>
    </div>
  );
};

export default StudentDashboard;