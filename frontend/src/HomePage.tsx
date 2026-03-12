import { lazy, useState, useEffect, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Brain,
  ArrowRight,
  LayoutDashboard,
  FileText,
  Zap,
  Clock,
  ChevronRight,
} from 'lucide-react';

const Navbar = lazy(() => import("./Navbar"));

// --- TYPES ---
interface IconProps {
  className?: string;
  size?: number | string;
}

interface StatCardProps {
  value: string;
  label: string;
  desc: string;
  color: "orange" | "purple";
  featured?: boolean;
}

interface FeatureCardProps {
  title: string;
  desc: string;
  icon: ReactNode;
  dark?: boolean;
  className?: string;
}

// --- SHARED COMPONENTS ---
const SchoolIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m4 6 8-4 8 4" />
    <path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
    <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
    <path d="M18 5v17" />
    <path d="M6 5v17" />
    <circle cx="12" cy="9" r="2" />
  </svg>
);

// --- ANIMATION COMPONENT ---
const HeroAnimation = () => {
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 0) {
      timer = setTimeout(() => setStep(1), 2500);
    } else if (step === 1) {
      timer = setTimeout(() => setStep(2), 2000);
    } else if (step === 2) {
      timer = setTimeout(() => setStep(0), 5000);
    }
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/5] md:aspect-square perspective-1000">
      {/* Removed the purple gradient blob from here */}

      <div className="relative z-10 w-full h-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-500">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ffa500]"></div>
            <div className="w-3 h-3 rounded-full bg-[#6c2dc7]"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 tracking-tight">AI Engine v3.0</div>
        </div>

        <div className="relative flex-1 p-6 flex flex-col justify-center">
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">School</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm flex items-center gap-2">
                  <SchoolIcon size={16} className="text-slate-400" /> Hillcrest High
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm">Grade 10</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm">Physics</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Term</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm">Term 2</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm">12 Weeks</div>
                </div>
              </div>
              <button className="w-full mt-4 bg-slate-900 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 group transition-all">
                Generate Scheme <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#6c2dc7] border-t-transparent rounded-full animate-spin"></div>
                <Brain className="absolute inset-0 m-auto text-[#6c2dc7] animate-pulse" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Analyzing Syllabus...</h3>
              <p className="text-sm text-slate-500 max-w-[200px]">Matching topics to Ministry Standards.</p>
              <div className="mt-6 w-full bg-slate-50 rounded p-3 text-left space-y-2 font-mono text-[10px] text-slate-500 opacity-80">
                <div className="animate-pulse">{`> Fetching Topic: Mechanics...`}</div>
                <div className="animate-pulse delay-75">{`> Calculating Weekly Load...`}</div>
                <div className="animate-pulse delay-150 text-[#ffa500]">{`> Compliance Check: PASSED`}</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="h-full flex flex-col animate-in slide-in-from-bottom-8 duration-700 fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-slate-900">Scheme of Work</h2>
                <span className="bg-[#ffa500]/10 text-[#ffa500] text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle size={10} /> Ready
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 p-4 relative overflow-hidden">
                <div className="flex border-b border-slate-100 pb-2 mb-2 gap-2">
                  <div className="w-1/6 h-3 bg-slate-200 rounded"></div>
                  <div className="w-3/6 h-3 bg-slate-200 rounded"></div>
                  <div className="w-2/6 h-3 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-2 items-start" style={{ animation: `fadeIn 0.5s ease-out forwards ${i * 0.2}s`, opacity: 0 }}>
                      <div className="w-8 h-8 rounded bg-[#6c2dc7]/10 flex items-center justify-center text-xs font-bold text-[#6c2dc7] shrink-0">W{i}</div>
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-3 bg-slate-100 rounded"></div>
                        <div className="w-2/3 h-2 bg-slate-50 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 right-4 rotate-[-15deg] border-2 border-[#ffa500] text-[#ffa500] font-black text-xs uppercase px-2 py-1 opacity-0 animate-in zoom-in duration-500 delay-1000 fill-mode-forwards">
                  APPROVED
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-4 scale-95 left-0 w-full h-full bg-white/50 rounded-2xl border border-slate-200 -z-10 shadow-lg"></div>
    </div>
  );
};

// --- MAIN PAGE ---
const HomePage = () => {
  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fill-mode-forwards { animation-fill-mode: forwards; }
      `}</style>

      {/* Changed background to #f0fff0 */}
      <div className="relative min-h-screen w-full bg-[#f0fff0] text-slate-900 font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        
        {/* Removed the dark background overlay from here */}

        <div className="relative z-10 flex flex-col items-center w-full">
          <Navbar />

          <section className="pt-32 pb-20 px-6 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              {/* Changed text-white to text-slate-900 for visibility on light bg */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-slate-900 tracking-tight">
                Stop writing <br />
                <span className="text-[#ffa500]">Schemes of Work.</span>
              </h1>
              {/* Changed text-slate-300 to text-slate-600 */}
              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Teachers waste 15+ hours/week on compliance paperwork. 
                Let BooxClash generate <strong>Ministry Compliant</strong> documents in seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  to="/" 
                  className="px-8 py-4 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white font-bold text-lg rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  For Schools <ArrowRight size={20} />
                </Link>
                {/* Updated button styling for light background */}
                <Link 
                  to="/home-booxclash-pro" 
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-semibold text-lg rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  For Teachers <Zap size={18} className="text-[#ffa500]" />
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md lg:max-w-xl">
              <HeroAnimation />
            </div>
          </section>

          <section className="py-20 px-6 w-full bg-white text-slate-900">
            <div className="max-w-5xl mx-auto text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">The Compliance Trap</h2>
              <p className="text-slate-600 text-lg">Why great teachers are leaving the profession.</p>
            </div>
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
              <StatCard value="10 hrs" label="Lost Weekly" desc="Time spent on admin instead of teaching." color="orange" />
              <StatCard value="40%" label="Burnout Rate" desc="Caused by excessive reporting requirements." color="orange" />
              <StatCard value="1 Click" label="The Solution" desc="Instant outputs from your syllabus." color="purple" featured />
            </div>
          </section>

          {/* Changed this section's background to match the top to blend nicely or kept it slightly off-white */}
          <section className="py-24 px-6 w-full bg-[#f0fff0] border-t border-slate-200/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900">
                  Complete <span className="text-[#6c2dc7]">School Operating System</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard 
                  title="Curriculum-Aware AI" 
                  desc="Trained on the National Curriculum. It knows exactly which topics are required for each grade."
                  icon={<Brain size={24} />}
                  className="md:col-span-2"
                />
                <FeatureCard 
                  title="Format Cloning" 
                  desc="Upload your template; we fill it perfectly. No formatting changes required."
                  icon={<FileText size={24} />}
                  dark
                />
                <FeatureCard 
                  title="Admin Dashboard" 
                  desc="Track syllabus coverage in real-time across all departments."
                  icon={<LayoutDashboard size={24} />}
                />
                <FeatureCard 
                  title="Automated Weekly Planning" 
                  desc="Missed a topic? The system automatically rolls it over to the next week."
                  icon={<Clock size={24} />}
                  className="md:col-span-2"
                />
              </div>
            </div>
          </section>

          <footer className="bg-white text-slate-500 py-12 w-full border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                
                <div className="flex items-center gap-3">
                <img 
                    src="/icon.png" 
                    alt="BooxClash Logo" 
                    className="w-8 h-8 object-contain"
                />
                <span className="text-slate-900 font-bold text-xl tracking-tight">BooxClash</span>
                </div>
                
                <div className="flex gap-8 text-sm font-medium">
                <Link to="/about" className="hover:text-slate-900 transition-colors">About</Link>
                <Link to="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
                <Link to="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
                </div>

                <div className="text-sm">
                &copy; {new Date().getFullYear()} BooxClash.
                </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

// --- HELPERS ---
const StatCard = ({ value, label, desc, color, featured = false }: StatCardProps) => (
  <div className={`p-6 rounded-2xl border ${featured ? 'bg-[#6c2dc7]/5 border-[#6c2dc7]/20' : 'bg-white border-slate-200 shadow-sm'} relative overflow-hidden`}>
    {featured && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6c2dc7] to-[#ffa500]" />}
    <div className={`text-4xl font-bold mb-2 ${color === 'orange' ? 'text-[#ffa500]' : 'text-[#6c2dc7]'}`}>{value}</div>
    <div className="text-slate-900 font-semibold mb-2">{label}</div>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);

const FeatureCard = ({ title, desc, icon, dark = false, className = "" }: FeatureCardProps) => (
  <div className={`p-8 rounded-2xl border shadow-sm ${dark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200'} ${className}`}>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${dark ? 'bg-white/10 text-white' : 'bg-[#6c2dc7]/10 text-[#6c2dc7]'}`}>
      {icon}
    </div>
    <h3 className={`text-xl font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    <p className={dark ? 'text-slate-300' : 'text-slate-600'}>{desc}</p>
  </div>
);

export default HomePage;