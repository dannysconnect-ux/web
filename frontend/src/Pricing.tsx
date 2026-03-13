import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  School, 
  User, 
  Calculator, 
  HelpCircle, 
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Pricing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'teacher' | 'school'>('teacher');
  const [teacherCount, setTeacherCount] = useState(10);

  // School Plan Calculation
  // Logic: Base K1000 for 10 teachers = K100 per teacher per term.
  const pricePerTeacherTerm = 100; 
  const totalSchoolPrice = teacherCount * pricePerTeacherTerm;

  return (
    <>
      <title>Pricing – BooxClash</title>
      <meta
        name="description"
        content="Affordable pricing for Zambian teachers and schools. Credits start at K50."
      />

      {/* --- LIGHT THEME BACKGROUND --- */}
      <div className="relative min-h-screen w-full bg-[#f0fff0] font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />

          <section className="pt-32 pb-20 px-6 w-full max-w-7xl mx-auto flex-grow">
            
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                No hidden fees. Pay for what you use. Upgrade anytime.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex justify-center mb-16">
              <div className="bg-white border border-slate-200 shadow-sm p-1 rounded-full inline-flex relative">
                <div 
                    className={`absolute inset-y-1 rounded-full bg-[#ffa500] shadow-md transition-all duration-300 ease-out ${
                        activeTab === 'teacher' ? 'left-1 w-[140px]' : 'left-[144px] w-[140px]'
                    }`}
                ></div>
                <button
                  onClick={() => setActiveTab('teacher')}
                  className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors w-[140px] flex items-center justify-center gap-2 ${
                    activeTab === 'teacher' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <User size={18} /> For Teachers
                </button>
                <button
                  onClick={() => setActiveTab('school')}
                  className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors w-[140px] flex items-center justify-center gap-2 ${
                    activeTab === 'school' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <School size={18} /> For Schools
                </button>
              </div>
            </div>

            {/* PRICING CARDS */}
            <AnimatePresence mode="wait">
              {activeTab === 'teacher' ? (
                <motion.div 
                    key="teacher"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                >
                  {/* Monthly Plan */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col">
                    <div className="mb-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Starter
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-bold text-slate-900">K50</span>
                        <span className="text-slate-500 font-medium">/month</span>
                    </div>
                    <p className="text-slate-500 mb-8 text-sm">Perfect for trying out the platform.</p>
                    
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-slate-700">
                            <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                            <span className="font-bold">80 Credits</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-700">
                            <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                            <span>Access to Lesson Planner</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-700">
                            <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                            <span>Basic AI Models</span>
                        </li>
                    </ul>

                    <button className="w-full py-4 rounded-xl border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-50 transition-colors">
                        Choose Monthly
                    </button>
                  </div>

                  {/* Termly Plan (Best Value) - Added Orange Shadow */}
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-700 shadow-[0_8px_30px_rgba(255,165,0,0.25)] flex flex-col relative overflow-hidden ring-4 ring-[#ffa500]/30">
                    <div className="absolute top-0 right-0 bg-[#ffa500] text-slate-900 text-xs font-bold px-4 py-2 rounded-bl-xl">
                        POPULAR
                    </div>
                    <div className="mb-4">
                        <span className="bg-[#ffa500]/20 text-[#ffa500] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Termly Bundle
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-bold text-white">K120</span>
                        <span className="text-slate-400 font-medium">/term</span>
                    </div>
                    <p className="text-slate-400 mb-8 text-sm">Save money and get more credits.</p>
                    
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center gap-3 text-white">
                            <div className="bg-[#ffa500] p-1 rounded-full"><Check size={14} className="text-slate-900" /></div>
                            <span className="font-bold text-lg">300 Credits</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-300">
                            <div className="bg-slate-700 p-1 rounded-full"><Check size={14} className="text-slate-300" /></div>
                            <span>~4 Months Validity</span>
                        </li>
                         <li className="flex items-center gap-3 text-slate-300">
                            <div className="bg-slate-700 p-1 rounded-full"><Check size={14} className="text-slate-300" /></div>
                            <span>Priority Support</span>
                        </li>
                    </ul>

                    <button 
                        onClick={() => navigate('/signup')}
                        className="w-full py-4 rounded-xl bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold shadow-[0_4px_14px_rgba(255,165,0,0.4)] transition-all transform hover:scale-[1.02]"
                    >
                        Get Termly Plan
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                    key="school"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Added Orange Shadow to School Plan too */}
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(255,165,0,0.15)] overflow-hidden border border-[#ffa500]/20">
                        <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12">
                            
                            {/* Left: Calculator */}
                            <div>
                                <div className="flex items-center gap-2 mb-6 text-[#ffa500] font-bold">
                                    <Calculator size={20} /> School Price Calculator
                                </div>
                                
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">How many teachers?</h3>
                                <div className="mb-8">
                                    <div className="flex justify-between text-slate-500 font-medium mb-4">
                                        <span>10 Teachers</span>
                                        <span>50 Teachers</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="50" 
                                        step="1"
                                        value={teacherCount}
                                        onChange={(e) => setTeacherCount(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ffa500]"
                                    />
                                    <div className="mt-4 text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-3xl font-bold text-slate-900">{teacherCount}</span>
                                        <span className="text-slate-500 ml-2">Teachers Selected</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                                        <span>Admin Dashboard Included</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                                        <span>Centralized Billing</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="bg-[#6c2dc7]/10 p-1 rounded-full"><Check size={14} className="text-[#6c2dc7]" /></div>
                                        <span>Transfer Credits between Staff</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Price Display */}
                            <div className="bg-slate-900 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
                                {/* Decor */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#6c2dc7]/40 rounded-full blur-3xl"></div>

                                <div className="relative z-10">
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wide mb-1">Total Termly Cost</p>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-5xl font-bold text-white">K{totalSchoolPrice.toLocaleString()}</span>
                                        <span className="text-slate-400">/term</span>
                                    </div>
                                    <div className="inline-block bg-white/10 rounded-lg px-3 py-1 mb-8">
                                        <span className="text-[#ffa500] text-sm font-bold">
                                            Only K{Math.round(pricePerTeacherTerm/3)} per teacher/month
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate('/contact')}
                                    className="relative z-10 w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
                                >
                                    Contact Sales <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advice Section for Schools (Light Theme Optimized) */}
                    <div className="mt-12 bg-white/60 border border-[#6c2dc7]/20 shadow-sm rounded-2xl p-6 backdrop-blur-md">
                        <div className="flex items-start gap-4">
                            <div className="bg-[#6c2dc7]/10 p-3 rounded-full hidden sm:block">
                                <HelpCircle className="text-[#6c2dc7]" size={24} />
                            </div>
                            <div>
                                <h4 className="text-slate-900 font-bold text-lg mb-2">BooxClash Advice: Why switch to the School Plan?</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Managing individual subscriptions is messy. With the School Plan, the administration buys credits in bulk (K1000 min) and distributes them. 
                                    This ensures <strong className="text-slate-900">standardized lesson planning</strong> across all grades and prevents teachers from having to pay out of their own pockets.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

          </section>
        </div>
      </div>
    </>
  );
}