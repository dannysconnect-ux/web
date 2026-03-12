import { motion } from "framer-motion";
import { 
  FileText, 
  BarChart3, 
  Brain, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Sparkles 
} from "lucide-react"; 
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar"; 

// You can swap these generic images for screenshots of your dashboard later
import aiImage from "/images/plan.png"; 
import planImage from "/images/tracking.png"; // Reusing as placeholder for "Planning"
import reportImage from "/images/reportImage.svg"; // Reusing as placeholder for "Reports"
import classImage from "/images/scheme.png"; // Reusing as placeholder for "Classroom"

export default function Features() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="w-8 h-8 text-[#ffa500]" />,
      title: "Digital Schemes of Work",
      description: "Stop writing by hand. Generate compliant, editable schemes of work for the entire term in seconds.",
      image: classImage,
    },
    {
      icon: <Brain className="w-8 h-8 text-[#6c2dc7]" />,
      title: "AI Lesson Plans",
      description: "Our Gemini-powered engine creates detailed daily lesson plans tailored to your specific class needs.",
      image: aiImage,
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-[#ffa500]" />,
      title: "Automated Reports",
      description: "Generate end-of-term student reports with a single click. No more manual calculation or data entry errors.",
      image: reportImage,
    },
    {
      icon: <Users className="w-8 h-8 text-[#6c2dc7]" />,
      title: "Classroom Management",
      description: "Track attendance, behavior, and participation in one secure dashboard accessible from any device.",
      image: planImage,
    },
  ];

  return (
    <>
      <title>Features - BooxClash</title>
      <meta
        name="description"
        content="Discover BooxClash features: AI lesson planning, digital schemes of work, and automated student reporting."
      />

      {/* --- LIGHT THEME BACKGROUND --- */}
      <div className="relative min-h-screen w-full bg-[#f0fff0] font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        
        <div className="relative z-10">
          <Navbar />

          <section className="pt-32 pb-20 px-6">
            <div className="max-w-7xl mx-auto">
              
              {/* Header */}
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-[#ffa500] font-bold tracking-wider uppercase text-sm">
                    Platform Overview
                  </span>
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6 leading-tight">
                    Everything you need to <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffa500] to-[#6c2dc7]">
                      run a modern school.
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Replace your filing cabinets with a single, intelligent platform. 
                    Designed specifically for the Zambian curriculum.
                  </p>
                </motion.div>
              </div>

              {/* FEATURE HIGHLIGHT: The "SmackDown" equivalent for B2B */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                // Light theme background with Orange shadow
                className="mb-24 bg-white rounded-3xl border border-[#ffa500]/20 p-8 md:p-12 shadow-[0_8px_30px_rgba(255,165,0,0.15)] relative overflow-hidden"
              >
                {/* Decorative background blob */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#6c2dc7]/10 rounded-full blur-3xl"></div>

                <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                  <div className="text-left">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-[#6c2dc7]/10 rounded-lg">
                        <Sparkles className="w-6 h-6 text-[#ffa500]" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        AI Assistant
                      </h3>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                        Plan a whole term in <span className="text-[#ffa500]">minutes</span>, not weeks.
                    </h2>
                    <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                      Just upload your syllabus topics. Our AI agent (powered by Gemini) instantly generates a compliant Scheme of Work and daily Lesson Plans for approval.
                    </p>
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-center gap-3 text-slate-700">
                            <CheckCircle className="text-[#ffa500] w-5 h-5" /> 
                            <span className="font-medium">Matches ECZ Curriculum Standards</span>
                        </li>
                        <li className="flex items-center gap-3 text-slate-700">
                            <CheckCircle className="text-[#ffa500] w-5 h-5" /> 
                            <span className="font-medium">Export to PDF or Word instantly</span>
                        </li>
                    </ul>
                    <button
                      onClick={() => navigate("/signup")}
                      className="bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl px-8 py-3.5 flex items-center gap-2 transition-all shadow-lg"
                    >
                      Try the AI Planner
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  
                  {/* Visual Representation (Light Theme Mock UI) */}
                  <div className="hidden md:flex justify-center items-center">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 w-full shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
                        {/* Mock UI Elements */}
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-4">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            <div className="ml-auto text-xs font-bold text-[#ffa500]">Generative AI Active</div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
                            <div className="h-24 bg-[#6c2dc7]/5 rounded w-full mt-4 border border-dashed border-[#6c2dc7]/30 flex items-center justify-center text-[#6c2dc7] font-medium text-sm">
                                Generating Lesson Plan...
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* GRID FEATURES */}
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    // Added a hover effect with the orange shadow
                    className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)] hover:border-[#ffa500]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="h-40 mb-6 overflow-hidden rounded-xl bg-slate-100 relative group border border-slate-100">
                        {/* Image Fallback/Overlay */}
                        <img 
                            src={feature.image} 
                            alt={feature.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/0 transition-colors"></div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">
                        {feature.title}
                        </h3>
                    </div>
                    
                    <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-grow">
                      {feature.description}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <span className="text-[#6c2dc7] text-sm font-semibold flex items-center gap-1 cursor-pointer hover:gap-2 transition-all">
                            Learn more <ArrowRight size={14} />
                        </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* BOTTOM CTA */}
              <div className="mt-24 text-center">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Stop drowning in paperwork.</h2>
                  <button
                    onClick={() => navigate("/signup")}
                    className="bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold rounded-full px-10 py-4 text-lg shadow-[0_4px_14px_rgba(255,165,0,0.4)] transition-all hover:scale-105"
                  >
                    Get Started for Free
                  </button>
              </div>

            </div>
          </section>
        </div>
      </div>
    </>
  );
}