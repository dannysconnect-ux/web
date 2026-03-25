import { lazy } from "react";
import { Link } from "react-router-dom";
import { 
    Target, Award, Users, Brain, 
    Zap, ShieldCheck, Globe, ArrowRight, Heart 
} from "lucide-react";

const Navbar = lazy(() => import("./Navbar"));

const AboutUs = () => {

  const stats = [
    { number: "500+", label: "Schools Partnered", icon: Users },
    { number: "10k+", label: "Lesson Plans Generated", icon: Brain },
    { number: "50k+", label: "Hours Saved", icon: Zap },
    { number: "100%", label: "Curriculum Compliant", icon: Award }
  ];

  const values = [
    {
      icon: Brain,
      title: "AI Innovation",
      description: "We leverage Gemini 3 Pro to automate the repetitive parts of teaching, allowing educators to focus on human connection.",
      color: "text-[#6c2dc7]",
      bg: "bg-[#6c2dc7]/10"
    },
    {
      icon: ShieldCheck,
      title: "Data Integrity",
      description: "Secure, private, and reliable. We ensure school data remains confidential and accessible only to authorized staff.",
      color: "text-[#ffa500]",
      bg: "bg-[#ffa500]/10"
    },
    {
      icon: Globe,
      title: "Local Context",
      description: "Built for the Zambian curriculum. We don't just import foreign standards; we digitize local requirements.",
      color: "text-[#6c2dc7]",
      bg: "bg-[#6c2dc7]/10"
    },
    {
      icon: Heart,
      title: "Teacher Wellbeing",
      description: "Reducing burnout by eliminating weekend paperwork. A happy teacher leads to a successful classroom.",
      color: "text-[#ffa500]",
      bg: "bg-[#ffa500]/10"
    }
  ];

  return (
    <>
      <title>About Us – BooxClash</title>
      <meta
        name="description"
        content="Learn about BooxClash's mission to digitize Zambian education through AI-powered administration and curriculum tools."
      />
      
      {/* --- LIGHT THEME BACKGRND --- */}
      <div className="relative min-h-screen w-full bg-[#f0fff0] font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">

         {/* CONTENT WRAPPER */}
         <div className="relative z-10 flex flex-col w-full">
            <Navbar />

            {/* 1. HERO SECTION */}
            <section className="pt-32 pb-20 px-6 text-center w-full max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 leading-tight">
                    Building the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffa500] to-[#6c2dc7]">Operating System</span><br /> for Modern Schools.
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed font-light">
                    BooxClash is not just a tool; it's a movement to reclaim time for educators. 
                    We combine state-of-the-art AI with deep local educational insights.
                </p>
            </section>

            {/* 2. MISSION STATEMENT (White Card with Orange Glow) */}
            <section className="px-6 pb-20 w-full">
                <div className="max-w-6xl mx-auto bg-white rounded-3xl p-10 md:p-16 shadow-[0_8px_30px_rgba(255,165,0,0.15)] border border-[#ffa500]/20">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
                            <p className="text-slate-600 text-lg leading-relaxed mb-6">
                                For decades, teachers have been burdened with manual paperwork—handwriting schemes of work, weekly forecasts, and daily lesson plans. This administrative load leads to burnout and takes time away from students.
                            </p>
                            <p className="text-slate-600 text-lg leading-relaxed font-medium">
                                We exist to solve this. By using advanced AI agents to "clone" school formats and generate content instantly, we return thousands of hours back to the education system.
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 shadow-inner">
                            <h3 className="text-[#6c2dc7] font-bold text-xl mb-6 flex items-center gap-2">
                                <Target size={24} className="text-[#ffa500]" /> Impact by the Numbers
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                {stats.map((stat, index) => (
                                    <div key={index}>
                                        <div className="text-3xl font-bold text-slate-900 mb-1">{stat.number}</div>
                                        <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. CORE VALUES */}
            <section className="py-20 px-6 w-full">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why We Do It</h2>
                        <div className="h-1 w-20 bg-[#ffa500] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {values.map((val, index) => (
                            <div 
                              key={index} 
                              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-[0_8px_30px_rgba(255,165,0,0.15)] hover:border-[#ffa500]/30 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className={`w-14 h-14 rounded-xl ${val.bg} ${val.color} flex items-center justify-center mb-6`}>
                                    <val.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{val.title}</h3>
                                <p className="text-slate-600 leading-relaxed text-sm">{val.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. FOUNDER / STORY SECTION */}
            <section className="py-20 px-6 w-full">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8">From The Team</h2>
                    <blockquote className="text-2xl font-light italic text-slate-600 leading-relaxed mb-8">
                        "We believe that technology shouldn't replace teachers. It should give them superpowers. When a teacher spends less time writing plans and more time looking a student in the eye, education improves."
                    </blockquote>
                    <div className="font-bold text-slate-900">The BooxClash Team</div>
                    <div className="text-[#ffa500] font-medium text-sm">Lusaka, Zambia</div>
                </div>
            </section>

            {/* 5. CTA SECTION */}
            <section className="py-20 px-6 text-center w-full relative overflow-hidden">
                {/* Subtle light theme gradient blob */}
                <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#ffa500]/20 via-[#6c2dc7]/10 to-transparent"></div>
                
                <div className="relative z-10 max-w-3xl mx-auto bg-white/60 backdrop-blur-md p-12 rounded-3xl border border-white shadow-xl">
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">
                        Ready to modernize your school?
                    </h2>
                    <p className="text-lg text-slate-600 mb-10">
                        Join the network of schools setting the new standard for educational efficiency.
                    </p>
                    <Link to="/signup" className="inline-flex items-center gap-2 bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 px-8 py-4 rounded-full text-lg font-bold transition-all duration-300 hover:scale-105 shadow-[0_4px_14px_rgba(255,165,0,0.4)]">
                        Partner With Us
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* LIGHT FOOTER */}
            <footer className="bg-white text-slate-600 py-12 w-full border-t border-slate-200 text-center">
                <div className="flex justify-center gap-8 mb-6 font-medium text-sm">
                    <Link to="/" className="hover:text-[#6c2dc7] transition-colors">Home</Link>
                    <Link to="/pricing" className="hover:text-[#6c2dc7] transition-colors">Pricing</Link>
                    <Link to="/contact" className="hover:text-[#6c2dc7] transition-colors">Contact</Link>
                </div>
                <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} BooxClash. All rights reserved.</p>
            </footer>

         </div>
      </div>
    </>
  );
};

export default AboutUs;