import { X, Download, Printer, FileCheck } from 'lucide-react';

interface LessonPlanProps {
  onClose: () => void;
}

export default function LessonPlan({ onClose }: LessonPlanProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      
      {/* MODAL WRAPPER */}
      <div className="bg-slate-100 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* TOOLBAR */}
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <FileCheck className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Lesson Plan Preview</h2>
              <p className="text-xs text-slate-500 font-mono">Source: Cambridge IGCSE Chemistry 0620</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Printer size={16} /> Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
              <Download size={16} /> PDF
            </button>
            <button 
              onClick={onClose}
              className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* DOCUMENT VIEW */}
        <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8 custom-scrollbar">
          
          {/* A4 PAPER EFFECT */}
          <div className="max-w-[850px] mx-auto bg-white min-h-[1100px] shadow-xl border border-slate-300 p-8 md:p-12 font-serif text-slate-900 relative">
            
            {/* Header / Branding */}
            <header className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-start">
              <div>
                 <h1 className="text-lg md:text-xl font-bold text-slate-800 uppercase tracking-wide">Cambridge International Examinations</h1>
                 <p className="text-sm text-slate-600 italic mt-1">Lesson Plan Template (V3 Compliance)</p>
              </div>
              <div className="text-right">
                  <span className="inline-block bg-slate-100 border border-slate-300 px-2 py-1 text-[10px] font-sans text-slate-500 uppercase tracking-wider">
                    AI-Generated Draft
                  </span>
              </div>
            </header>

            {/* META DATA */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8 text-sm">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 uppercase text-[10px] mb-1">Teacher Name</span>
                <div className="border-b border-slate-300 py-1 font-medium">K. Chilongo</div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 uppercase text-[10px] mb-1">Date</span>
                <div className="border-b border-slate-300 py-1">Monday, 12th Feb 2026</div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 uppercase text-[10px] mb-1">Class Level / Subject</span>
                <div className="border-b border-slate-300 py-1">IGCSE Chemistry (0620) - Grade 10</div>
              </div>
               <div className="flex flex-col">
                <span className="font-bold text-slate-700 uppercase text-[10px] mb-1">Topic</span>
                <div className="border-b border-slate-300 py-1 font-bold text-emerald-800">1.1 States of Matter & Kinetic Theory</div>
              </div>
            </div>

            {/* OBJECTIVES */}
            <div className="border border-slate-300 p-4 mb-6 bg-slate-50/50">
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <h4 className="font-bold text-slate-700 text-xs uppercase mb-1">Teaching Aims</h4>
                        <p className="text-sm leading-relaxed text-slate-800">
                            To introduce the concept that matter exists in three states (solid, liquid, gas) determined by particle arrangement and energy. To explain changes of state using Kinetic Theory.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold text-slate-700 text-xs uppercase mb-1">Learning Outcomes</h4>
                        <ul className="list-disc pl-4 text-sm space-y-1 text-slate-800">
                            <li>State the distinguishing properties of solids, liquids and gases.</li>
                            <li>Describe structure in terms of particle separation, arrangement, and motion.</li>
                            <li>Describe changes of state (melting, boiling, evaporation).</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-xs uppercase mb-1">Syllabus Assessment Objectives</h4>
                        <p className="text-sm text-slate-800">
                            <strong>AO1:</strong> Knowledge with understanding.<br/>
                            <strong>AO2:</strong> Handling information and solving problems.
                        </p>
                    </div>
                </div>
            </div>

            {/* CONTEXT */}
            <div className="mb-8">
               <h3 className="font-bold text-slate-800 text-sm uppercase mb-2 border-b border-slate-200 pb-1">Learner Context</h3>
               
               <div className="grid grid-cols-1 gap-4">
                  <div className="border border-slate-300 p-3">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Assumptions about previous learning</span>
                    <p className="text-sm">Students recall the water cycle from lower secondary science. They understand 'temperature' as a measure of heat.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="border border-slate-300 p-3 bg-red-50/30">
                        <span className="block text-[10px] font-bold uppercase text-red-500 mb-1">Anticipated Problems</span>
                        <ul className="list-disc pl-4 text-sm space-y-1">
                          <li>Confusing "evaporation" with "boiling".</li>
                          <li>Misconception that particles themselves expand.</li>
                        </ul>
                     </div>
                     <div className="border border-slate-300 p-3 bg-green-50/30">
                        <span className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Solutions</span>
                        <ul className="list-disc pl-4 text-sm space-y-1">
                          <li>Use heating curve graph to distinguish boiling point.</li>
                          <li>Use "Beads in a Jar" analogy for particle size.</li>
                        </ul>
                     </div>
                  </div>
               </div>
            </div>

            {/* TIMETABLE */}
            <div className="mb-8">
              <h3 className="font-bold text-slate-800 text-sm uppercase mb-2 bg-slate-100 p-2 border border-slate-300 border-b-0">Planned Timings & Activities</h3>
              
              <table className="w-full text-sm border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-400 p-2 text-left w-24">Timing</th>
                    <th className="border border-slate-400 p-2 text-left">Activity</th>
                    <th className="border border-slate-400 p-2 text-left w-24">Interaction</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-3 font-bold align-top">
                        0-10 min<br/>
                        <span className="text-xs font-normal text-slate-500">(Beginning)</span>
                    </td>
                    <td className="border border-slate-400 p-3 align-top">
                      <strong>Starter: "Mystery Balloon"</strong><br/>
                      Show a balloon inflated over a flask of hot water. Ask: "Why is it expanding if no air was added?"<br/>
                      <em className="text-slate-600">Goal: Elicit ideas about particles moving faster.</em>
                    </td>
                    <td className="border border-slate-400 p-3 text-xs align-top">T-S (Teacher-Student)</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-3 font-bold align-top">
                        10-25 min<br/>
                        <span className="text-xs font-normal text-slate-500">(Middle)</span>
                    </td>
                    <td className="border border-slate-400 p-3 align-top">
                      <strong>Activity 1: Roleplay Particle Arrangement</strong><br/>
                      Students stand in groups to represent Solids (linked arms, vibrating), Liquids (touching but sliding), Gases (far apart, fast).
                    </td>
                    <td className="border border-slate-400 p-3 text-xs align-top">S-S (Group Work)</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-3 font-bold align-top">
                        25-45 min<br/>
                        <span className="text-xs font-normal text-slate-500">(Middle)</span>
                    </td>
                    <td className="border border-slate-400 p-3 align-top">
                      <strong>Core Theory & Note Taking</strong><br/>
                      Draw particle diagrams on board. Define 'Melting Point' and 'Boiling Point'.<br/>
                      <em className="text-slate-600">Check for understanding: Ask students to draw the transition of Ice - Water - Steam.</em>
                    </td>
                    <td className="border border-slate-400 p-3 text-xs align-top">T-S (Lecture)</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-3 font-bold align-top">
                        45-55 min<br/>
                        <span className="text-xs font-normal text-slate-500">(End)</span>
                    </td>
                    <td className="border border-slate-400 p-3 align-top">
                      <strong>Plenary: Exit Ticket</strong><br/>
                      Question: "Why does perfume smell stronger on a hot day?" (Relate to kinetic energy/diffusion).
                    </td>
                    <td className="border border-slate-400 p-3 text-xs align-top">Individual</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="grid grid-cols-2 gap-6 mb-4 pt-4 border-t border-slate-300">
               <div>
                  <h4 className="font-bold text-slate-700 text-xs uppercase mb-1">Resources</h4>
                  <ul className="list-disc pl-4 text-sm">
                    <li>Balloons, Conical Flask, Kettle.</li>
                    <li>IGCSE Chemistry Textbook Pg 4-5.</li>
                  </ul>
               </div>
               <div>
                  <h4 className="font-bold text-slate-700 text-xs uppercase mb-1">Homework</h4>
                  <p className="text-sm">
                    Complete "States of Matter" Worksheet questions 1-5.<br/>
                    Read ahead: Diffusion (Topic 3.2).
                  </p>
               </div>
            </div>

            {/* SIGNATURE */}
            <div className="mt-12 pt-8 border-t-2 border-slate-800 flex justify-between items-center">
               <div className="text-xs text-slate-500">
                  <p>Generated by <strong>Booxclash Teacher Agent</strong></p>
                  <p className="font-mono mt-1">Ref: 2026-IGCSE-0620-TOPIC-3.1</p>
               </div>
               <div className="h-10 w-32 border-b border-slate-400 text-right text-xs text-slate-400 pt-8">
                  Checked by HoD
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}