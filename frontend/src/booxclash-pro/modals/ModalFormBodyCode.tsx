import React, { useMemo } from 'react';
import { 
  Hash, Users, Search, ChevronDown, AlertTriangle, Loader2, 
  Book, Brain, Lock, ListFilter, FileQuestion, Layers, Sparkles 
} from 'lucide-react';
import { ModalType } from './types'; 

interface ModalFormBodyProps {
  type: ModalType | 'exam' | 'catchup' | any; 
  formData: any;
  setFormData: (data: any) => void;
  loadingSubjects: boolean;
  subjectOptions: string[];
  gradeWarning: string | null;
  loadingPlan: boolean;
  fetchWeeklyPlan: () => void;
  availableDays: any[];
  selectedDayIndex: string;
  handleDaySelect: (val: string) => void;
  loadingLessons: boolean;
  availableLessons: any[];
  selectedLessonId: string;
  handleLessonSelect: (val: string) => void;
  
  // Catch-Up Props
  availableLevels?: string[];
  availableActivities?: any[];
  
  // Syllabus Props
  isSyllabusGrade?: boolean;
  syllabusStructure?: any[];
  loadingSyllabus?: boolean;

  // SCHEMES PROP 
  schemes?: any[]; 
}

const bloomsLevels = [
  { level: "Remembering", desc: "Recall facts and basic concepts" },
  { level: "Understanding", desc: "Explain ideas or concepts" },
  { level: "Applying", desc: "Use information in new situations" },
  { level: "Analyzing", desc: "Draw connections among ideas" },
  { level: "Evaluating", desc: "Justify a stand or decision" },
  { level: "Creating", desc: "Produce new or original work" }
];

// DEFINED ALL EXAM QUESTION TYPES
const EXAM_QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice', default: 0, max: 50 },
  { id: 'true_false', label: 'True / False', default: 0, max: 30 },
  { id: 'matching', label: 'Matching Pairs', default: 0, max: 5 }, // 1 matching question = 1 block of 5 pairs
  { id: 'short_answer', label: 'Short Answer', default: 0, max: 30 },
  { id: 'computational', label: 'Problem Solving', default: 0, max: 20 },
  { id: 'essay', label: 'Essay / Open', default: 0, max: 10 },
  { id: 'case_study', label: 'Case Study', default: 0, max: 5 }
];

const ModalFormBody: React.FC<ModalFormBodyProps> = ({ 
  type, formData, setFormData, 
  loadingSubjects, subjectOptions, gradeWarning,
  loadingPlan, fetchWeeklyPlan, 
  availableDays, selectedDayIndex, handleDaySelect,
  isSyllabusGrade = false,
  syllabusStructure = [], 
  loadingSyllabus = false,
  schemes = [],
  availableLevels = [],
  availableActivities = []
}) => {
  
  if (!type) return null;

  // ==========================================
  // 🎛️ LOGIC SWITCHES
  // ==========================================
  const showSchool = ['scheme', 'weekly', 'record', 'lesson', 'exam', 'catchup'].includes(type); 
  const showDate = ['scheme', 'weekly', 'record', 'lesson'].includes(type); 
  const showTerm = ['scheme', 'weekly', 'record', 'lesson', 'exam', 'catchup'].includes(type);
  const showWeeks = ['scheme'].includes(type);
  const showDays = ['weekly', 'record'].includes(type);
  const showWeekNum = ['weekly', 'record', 'lesson', 'catchup'].includes(type); 
  const showLogistics = ['lesson'].includes(type);
  const showBlooms = type === 'lesson'; 
  
  // 🆕 MULTI-TOPIC SELECTION (Now enabled for both Exams AND Schemes)
  const showMultiTopicSelection = ['exam', 'scheme'].includes(type);
  const showExamBlueprint = type === 'exam';

  // If it's weekly and we have schemes, use the Scheme Selectors
  const showSchemeSelectors = type === 'weekly' && schemes.length > 0;
  
  // Only show manual inputs if we aren't using Scheme Selectors OR Syllabus Selectors
  // And hide them for catchup (which has its own logic)
  const showManualTopic = !showSchemeSelectors && type !== 'catchup' && (
      ['weekly', 'record'].includes(type) || 
      (type === 'lesson' && !isSyllabusGrade)
  );
  
  const showSyllabusSelectors = type === 'lesson' && isSyllabusGrade;
  const showLessonTitle = (type === 'lesson' && !isSyllabusGrade);

  const storedSchoolId = localStorage.getItem('schoolId');

  // ==========================================
  // 📊 DATA MEMOIZATION
  // ==========================================

  // --- 1. SYLLABUS LOGIC (For Lesson Plans) ---
  const currentSubtopics = useMemo(() => {
     if (!formData.topic || !syllabusStructure.length) return [];
     const topicObj = syllabusStructure.find((t: any) => {
         const tTitle = t.title || t.topic || "";
         return tTitle === formData.topic;
     });
     if (!topicObj) return [];
     return topicObj.subtopics || topicObj.content || topicObj.children || [];
  }, [formData.topic, syllabusStructure]);

  // --- 2. SCHEME LOGIC (For Weekly Plans) ---
  const schemeTopics = useMemo(() => {
    if (!schemes || schemes.length === 0) return [];
    const topics = schemes.map(s => s.topic);
    return [...new Set(topics)].filter(Boolean); 
  }, [schemes]);

  const schemeSubtopics = useMemo(() => {
    if (!formData.topic || !schemes) return [];
    return schemes.filter(s => s.topic === formData.topic);
  }, [schemes, formData.topic]);

  // ==========================================
  // 🛠️ HANDLERS
  // ==========================================

  const handleSchemeSubtopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedSubtopic = e.target.value;
      
      const weekData = schemes.find(s => {
          const outcomesStr = s.outcomes ? (Array.isArray(s.outcomes) ? s.outcomes[0] : s.outcomes) : null;
          const subtopicStr = s.subtopic;
          const contentStr = s.content ? (Array.isArray(s.content) ? s.content[0] : s.content) : null;
          
          const sTitle = outcomesStr || subtopicStr || contentStr || `Week ${s.week || s.week_number}`;
          
          return s.topic === formData.topic && sTitle === selectedSubtopic;
      });

      const extractedObjectives = weekData 
          ? (weekData.outcomes || weekData.content || weekData.objectives || weekData.specific_competences || []) 
          : [];

      setFormData((prev: any) => ({ 
          ...prev, 
          lessonTitle: selectedSubtopic, 
          objectives: extractedObjectives 
      }));
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
       setFormData({ ...formData, grade: e.target.value });
  };

  const handleNumberInput = (field: string, value: string, max: number) => {
    if (value === '') { setFormData({ ...formData, [field]: '' }); return; }
    const num = parseInt(value);
    if (!isNaN(num) && num <= max) { setFormData({ ...formData, [field]: num }); }
  };

  // 🆕 UNIFIED HANDLER FOR EXAMS & SCHEMES TOPICS
  const handleBlueprintChange = (field: string, val: string) => {
    const num = parseInt(val) || 0;
    const currentBlueprint = formData.blueprint || {};
    EXAM_QUESTION_TYPES.forEach(t => {
        if (currentBlueprint[t.id] === undefined) currentBlueprint[t.id] = t.default;
    });

    setFormData({
        ...formData,
        blueprint: { ...currentBlueprint, [field]: num }
    });
  };

  return (
    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
      
      {/* 1. School Name */}
      {showSchool && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">School Name</label>
          <div className="relative">
            <input 
                type="text" 
                value={formData.school || ""} 
                disabled={!!storedSchoolId} 
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] focus:border-[#ffa500] outline-none placeholder:text-slate-400 ${storedSchoolId ? 'pl-10 opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                placeholder="e.g. Lusaka High School"
                onChange={(e) => setFormData({...formData, school: e.target.value})}
            />
            {storedSchoolId && (
                <Lock size={14} className="absolute left-3 top-4 text-slate-400" />
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. STANDARD GRADE & SUBJECT (Hidden for Catch-Up)           */}
      {/* ========================================================= */}
      {type !== 'catchup' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Grade / Class</label>
            <div className="relative">
              <select 
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none"
                  value={formData.grade}
                  onChange={handleGradeChange}
              >
                  <option value="">-- Select Level --</option>
                  <optgroup label="Junior Secondary (Forms)">
                      <option value="Form 1">Form 1</option>
                      <option value="Form 2">Form 2</option>
                      <option value="Form 3">Form 3</option>
                      <option value="Form 4">Form 4</option>
                      <option value="Form 5">Form 5</option>
                  </optgroup>
                  <optgroup label="Senior Secondary (Grades)">
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                  </optgroup>
                  <optgroup label="Primary (Grades)">
                      <option value="PreSchool">Pre-School</option>
                      <option value="Reception">Reception</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                  </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
            {loadingSubjects ? (
               <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-500 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading...
               </div>
            ) : subjectOptions.length > 0 ? (
                <div className="relative">
                  <select 
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value, lessonTitle: '', topic: '', topics: []})}
                  >
                      <option value="">-- Select Subject --</option>
                      {subjectOptions.map((sub, idx) => (
                          <option key={idx} value={sub}>{sub}</option>
                      ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                </div>
            ) : (
                <input 
                  type="text" 
                  placeholder={formData.grade ? "Type subject..." : "Select Grade first"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#ffa500] outline-none placeholder:text-slate-400"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value, lessonTitle: '', topic: '', topics: []})}
                />
            )}
          </div>
        </div>
      )}

      {gradeWarning && type !== 'catchup' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm font-medium">{gradeWarning}</p>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🆕 3. DYNAMIC CATCH-UP ASSISTANT (TaRL Levels & Activities) */}
      {/* ========================================================= */}
      {type === 'catchup' && (
        <div className="space-y-4 bg-amber-50/50 p-4 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Catch-Up Programme (TaRL)</span>
            </div>

            {/* A. SUBJECT */}
            <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-1">Catch-Up Subject</label>
                <select 
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ 
                        ...formData, 
                        subject: e.target.value, 
                        grade: 'Catch-Up',
                        catchupLevel: '',
                        lessonTitle: '',
                        catchupSteps: [],
                        catchupMaterials: []
                    })}
                >
                    <option value="">-- Select Subject --</option>
                    <option value="Literacy">Literacy</option>
                    <option value="Numeracy">Numeracy</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
            </div>

            {/* B. LEVEL DROPDOWN */}
            {formData.subject && (
                <div className="relative animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Target Catch-Up Level</label>
                    <select 
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.catchupLevel || ''}
                        onChange={(e) => setFormData({ 
                            ...formData, 
                            catchupLevel: e.target.value,
                            lessonTitle: '' 
                        })}
                    >
                        <option value="">-- Select Level --</option>
                        {availableLevels?.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* C. ACTIVITIES DROPDOWN */}
            {formData.catchupLevel && availableActivities && availableActivities.length > 0 && (
                <div className="relative animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Activity Focus</label>
                    <select 
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.lessonTitle || ''}
                        onChange={(e) => {
                            const selectedAct = availableActivities.find(a => a.activity_name === e.target.value);
                            setFormData({ 
                                ...formData, 
                                topic: `Catch-Up ${formData.subject}: ${formData.catchupLevel}`,
                                lessonTitle: selectedAct?.activity_name || "",
                                objectives: selectedAct?.objectives || [],
                                catchupSteps: selectedAct?.steps || [],
                                catchupMaterials: selectedAct?.materials || []
                            });
                        }}
                    >
                        <option value="">-- Select Activity --</option>
                        
                        <optgroup label="General Activities (All Levels)">
                            {availableActivities.filter(a => a.labelTag === 'General').map((act, idx) => (
                                <option key={`gen-${idx}`} value={act.activity_name}>{act.activity_name}</option>
                            ))}
                        </optgroup>

                        <optgroup label={`${formData.catchupLevel} Activities`}>
                            {availableActivities.filter(a => a.labelTag === formData.catchupLevel).map((act, idx) => (
                                <option key={`spec-${idx}`} value={act.activity_name}>{act.activity_name}</option>
                            ))}
                        </optgroup>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* D. Catch-Up Logistics (Date, Time, Enrolment) */}
            <div className="grid grid-cols-2 gap-4 border-t border-amber-200 pt-4 mt-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                    <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Boys</label>
                    <input type="number" min="0" value={formData.boys} onChange={(e) => setFormData({ ...formData, boys: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Time</label>
                    <div className="flex items-center gap-1">
                        <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500" />
                        <span className="text-slate-400">-</span>
                        <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Girls</label>
                    <input type="number" min="0" value={formData.girls} onChange={(e) => setFormData({ ...formData, girls: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-sm focus:outline-none focus:border-amber-500" />
                </div>
            </div>
        </div>
      )}

      {/* 4. Week Number & Select Lesson from Week */}
      {showWeekNum && (
        <div className="space-y-3">
           <div className="flex items-end gap-2">
               <div className="flex-1">
                   <label className="block text-sm font-bold text-[#6c2dc7] mb-1 flex items-center gap-1">
                     <Hash size={14} /> Week Number
                   </label>
                   <input 
                     type="number" 
                     inputMode="numeric"
                     className="w-full bg-white border border-[#6c2dc7]/30 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-[#6c2dc7] outline-none"
                     placeholder="e.g. 2"
                     min={1} 
                     max={20} 
                     value={formData.weekNumber || ''} 
                     onChange={(e) => handleNumberInput('weekNumber', e.target.value, 20)}
                   />
               </div>
               
               {type === 'lesson' && !isSyllabusGrade && (
                   <button 
                     type="button"
                     onClick={fetchWeeklyPlan}
                     disabled={loadingPlan}
                     className="mb-[2px] px-4 py-3 bg-[#6c2dc7]/10 border border-[#6c2dc7]/20 text-[#6c2dc7] font-bold rounded-lg hover:bg-[#6c2dc7]/20 transition-colors flex items-center gap-2"
                   >
                     {loadingPlan ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                     {loadingPlan ? "Loading..." : "Find Plan"}
                   </button>
               )}
           </div>
           
           {availableDays.length > 0 && type === 'lesson' && !isSyllabusGrade && (
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                       Select a Lesson from Week {formData.weekNumber}
                   </label>
                   <div className="relative">
                       <select 
                           className="w-full appearance-none bg-white border border-slate-200 rounded-md p-2 text-slate-900 text-sm focus:border-[#6c2dc7] outline-none cursor-pointer"
                           value={selectedDayIndex}
                           onChange={(e) => handleDaySelect(e.target.value)}
                       >
                           <option value="">-- Select Day --</option>
                           {availableDays.map((day: any, idx: number) => (
                               <option key={idx} value={idx}>
                                    {day.day} - {day.subtopic || "No Topic"}
                                </option>
                           ))}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                   </div>
               </div>
           )}
        </div>
      )}

      {/* 5. Standard Logistics */}
      {showLogistics && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                <Users size={16} className="text-slate-500" /> Enrolment & Timing
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Boys</label>
                    <input 
                        type="number" inputMode="numeric" 
                        className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                        placeholder="0" value={formData.boys || ''} 
                        onChange={(e) => handleNumberInput('boys', e.target.value, 100)}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Girls</label>
                    <input 
                        type="number" inputMode="numeric" 
                        className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                        placeholder="0" value={formData.girls || ''} 
                        onChange={(e) => handleNumberInput('girls', e.target.value, 100)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Start Time</label>
                    <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                        value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">End Time</label>
                    <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-slate-900 text-sm focus:outline-none focus:border-[#ffa500]"
                        value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                </div>
            </div>
        </div>
      )}

      {/* 6. Terms & Dates */}
      {(showTerm || showDate) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showTerm && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Term</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                value={formData.term}
                onChange={(e) => setFormData({...formData, term: e.target.value})}
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
          )}
          {showDate && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {type === 'record' ? "Week Ending Date" : "Start Date"}
                </label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
           )}
        </div>
      )}

      {/* 7. Extra Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showWeeks && (
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Total Weeks (Max 20)</label>
                <input 
                  type="number" inputMode="numeric" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                  placeholder="e.g. 13" min={1} max={20} 
                  value={formData.weeks || ''} 
                  onChange={(e) => handleNumberInput('weeks', e.target.value, 20)} 
                />
             </div>
          )}
          {showDays && (
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Days / Week (Max 5)</label>
                <input 
                  type="number" inputMode="numeric" max={5} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#ffa500]"
                  placeholder="e.g. 5" value={formData.days || ''} 
                  onChange={(e) => handleNumberInput('days', e.target.value, 5)} 
                />
             </div>
          )}
      </div>

      {/* 8. Bloom's Taxonomy */}
      {showBlooms && (
        <div className="bg-indigo-50/50 p-4 border border-indigo-200 rounded-xl space-y-2">
           <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Pedagogical Approach</span>
           </div>
           <div className="relative">
                <select 
                    className="w-full appearance-none bg-white border border-indigo-200 rounded-lg p-3 text-slate-900 focus:border-indigo-500 outline-none"
                    value={formData.bloomsLevel || ''}
                    onChange={(e) => setFormData({ ...formData, bloomsLevel: e.target.value })}
                >
                    <option value="">-- Select Bloom's Taxonomy Level --</option>
                    {bloomsLevels.map((b) => (
                        <option key={b.level} value={b.level}>
                            {b.level} - {b.desc}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TOPICS SELECTION (EXAMS & SCHEMES) */}
      {/* ========================================================================= */}
      {showMultiTopicSelection && (
        <div className={`space-y-4 p-4 border rounded-xl animate-in fade-in ${type === 'exam' ? 'bg-rose-50/50 border-rose-200' : 'bg-blue-50/50 border-blue-200'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Layers size={16} className={type === 'exam' ? 'text-rose-600' : 'text-blue-600'} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${type === 'exam' ? 'text-rose-700' : 'text-blue-700'}`}>
                        {type === 'exam' ? 'Select Exam Topics' : 'Select Scheme Topics'}
                    </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${type === 'exam' ? 'text-rose-700 bg-rose-100' : 'text-blue-700 bg-blue-100'}`}>
                    {formData.topics?.length || 0} Selected
                </span>
            </div>

            {loadingSyllabus ? (
                <div className="flex items-center justify-center p-6 text-slate-500 gap-2 border border-slate-200 bg-white rounded-xl">
                    <Loader2 size={18} className="animate-spin" /> Fetching official topics...
                </div>
            ) : syllabusStructure && syllabusStructure.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 p-3 bg-white rounded-xl border border-slate-200">
                    {syllabusStructure.map((topicObj: any, idx: number) => {
                        const topicName = typeof topicObj === 'string' ? topicObj : (topicObj.title || topicObj.topic || topicObj.name);
                        if (!topicName) return null;
                        
                        const isTopicChecked = (formData.topics || []).includes(topicName);
                        // Safely extract subtopics array from syllabus JSON
                        const tSubtopics = topicObj.subtopics || topicObj.sub_topics || topicObj.content || [];

                        return (
                            <div key={idx} className="flex flex-col mb-1 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                {/* MAIN TOPIC ROW */}
                                <label className="flex items-start space-x-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <div className="flex items-center h-5 mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isTopicChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Add the topic
                                                    setFormData({
                                                        ...formData, 
                                                        topics: [...(formData.topics || []), topicName]
                                                    });
                                                } else {
                                                    // Remove the topic AND all its subtopics
                                                    setFormData({
                                                        ...formData, 
                                                        topics: (formData.topics || []).filter((t: string) => t !== topicName),
                                                        subtopics: (formData.subtopics || []).filter((s: string) => {
                                                            // Keep subtopics that don't belong to this un-checked topic
                                                            const isSubOfThisTopic = tSubtopics.some((subItem: any) => {
                                                                const subName = typeof subItem === 'string' ? subItem : (subItem.name || subItem.title || '');
                                                                return subName === s;
                                                            });
                                                            return !isSubOfThisTopic;
                                                        })
                                                    });
                                                }
                                            }}
                                            className={`w-4 h-4 rounded border-slate-300 bg-white ${type === 'exam' ? 'text-rose-500 focus:ring-rose-500' : 'text-blue-500 focus:ring-blue-500'}`}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 leading-tight">
                                        {topicName}
                                    </span>
                                </label>

                                {/* SUBTOPIC NESTED ROW (Only visible if Main Topic is selected) */}
                                {isTopicChecked && tSubtopics.length > 0 && (
                                    <div className="ml-8 mt-1 space-y-1.5 border-l-2 border-slate-100 pl-3 animate-in fade-in slide-in-from-top-1">
                                        {tSubtopics.map((sub: any, subIdx: number) => {
                                            const subName = typeof sub === 'string' ? sub : (sub.name || sub.title || `Subtopic ${subIdx + 1}`);
                                            if (!subName) return null;
                                            
                                            const isSubChecked = (formData.subtopics || []).includes(subName);

                                            return (
                                                <label key={subIdx} className="flex items-start space-x-2 py-1 cursor-pointer group">
                                                    <div className="flex items-center h-4 mt-[1px]">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSubChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData({
                                                                        ...formData, 
                                                                        subtopics: [...(formData.subtopics || []), subName]
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData, 
                                                                        subtopics: (formData.subtopics || []).filter((s: string) => s !== subName)
                                                                    });
                                                                }
                                                            }}
                                                            className={`w-3.5 h-3.5 rounded border-slate-200 bg-white ${type === 'exam' ? 'text-rose-400 focus:ring-rose-400' : 'text-blue-400 focus:ring-blue-400'}`}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium group-hover:text-slate-800 leading-tight transition-colors">
                                                        {subName}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-xs text-amber-800 p-4 border border-amber-200 rounded-xl bg-amber-50 flex flex-col items-center text-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p>No official syllabus topics found for <b className="font-bold">{formData.grade} {formData.subject}</b>.</p>
                    <p className="text-amber-700/80">
                        You can still generate the {type === 'exam' ? 'exam' : 'scheme'}, and the AI will create a generalized {type === 'exam' ? 'assessment' : 'plan'} for this level.
                    </p>
                </div>
            )}
        </div>
      )}

      {/* UPGRADED BLUEPRINT UI */}
      {showExamBlueprint && (
        <div className="bg-rose-50/50 p-4 border border-rose-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2">
                <FileQuestion size={16} className="text-rose-600" />
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Exam Layout (Question Distribution)</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {EXAM_QUESTION_TYPES.map((qt) => {
                    const currentValue = formData.blueprint?.[qt.id] !== undefined ? formData.blueprint[qt.id] : qt.default;
                    return (
                        <div key={qt.id} className="bg-white border border-slate-200 rounded-xl p-3 text-center transition-all focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400 hover:shadow-sm">
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider leading-tight h-6 flex items-center justify-center">
                                {qt.label}
                            </label>
                            <input 
                                type="number" min="0" max={qt.max} inputMode="numeric"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-center text-slate-900 outline-none focus:border-rose-400 text-sm font-bold"
                                value={currentValue}
                                onChange={(e) => handleBlueprintChange(qt.id, e.target.value)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* 10. Topics - SYLLABUS, WEEKLY, OR MANUAL (Skipped for Schemes & Exams now) */}
      {(showManualTopic || showLessonTitle || showSyllabusSelectors || showSchemeSelectors) && (
         <div className="space-y-4 bg-white p-4 border border-slate-200 shadow-sm rounded-xl">
           <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Lesson Focus</span>
           </div>

           {/* A. SCHEME SELECTOR (For Weekly Plans using Generated Schemes) */}
           {showSchemeSelectors && (
              <div className="space-y-4 animate-in fade-in">
                  {/* Topic Selector */}
                  <div className="relative">
                       <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                          <ListFilter size={14} className="text-[#ffa500]"/> Select Topic (From Schemes)
                       </label>
                       <select 
                           className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] outline-none"
                           value={formData.topic}
                           onChange={(e) => setFormData({ ...formData, topic: e.target.value, lessonTitle: "" })}
                       >
                           <option value="">-- Choose a Topic --</option>
                           {schemeTopics.map((t: string, idx: number) => (
                               <option key={idx} value={t}>{t}</option>
                           ))}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Subtopic Selector */}
                  {formData.topic && (
                      <div className="relative animate-in fade-in slide-in-from-top-2">
                           <label className="block text-sm font-bold text-slate-700 mb-1">Select Subtopic / Content</label>
                           <select 
                               className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] outline-none"
                               value={formData.lessonTitle} // Using lessonTitle to store subtopic for weekly
                               onChange={handleSchemeSubtopicChange}
                           >
                               <option value="">-- Choose Subtopic --</option>
                               {schemeSubtopics.map((s: any, idx: number) => {
                                   const outcomesStr = s.outcomes ? (Array.isArray(s.outcomes) ? s.outcomes[0] : s.outcomes) : null;
                                   const subtopicStr = s.subtopic;
                                   const contentStr = s.content ? (Array.isArray(s.content) ? s.content[0] : s.content) : null;
                                   
                                   const optionValue = outcomesStr || subtopicStr || contentStr || `Week ${s.week || s.week_number}`;

                                   return (
                                       <option key={idx} value={optionValue}>
                                            Wk {s.week || s.week_number}: {optionValue}
                                       </option>
                                   );
                               })}
                           </select>
                           <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                           
                           {/* Visual feedback for the objectives */}
                           {formData.objectives && formData.objectives.length > 0 ? (
                               <p className="text-[10px] text-emerald-600 font-medium mt-2 pl-1 flex items-start gap-1">
                                   <span className="shrink-0 mt-0.5">✓</span> Objectives automatically loaded
                               </p>
                           ) : (
                               <p className="text-[10px] text-slate-500 font-medium mt-1 pl-1">
                                   Selecting this will log the full weekly content.
                               </p>
                           )}
                      </div>
                  )}
              </div>
           )}

           {/* B. SYLLABUS SELECTOR (For Lesson Plans using Syllabus) */}
           {showSyllabusSelectors && (
              <div className="space-y-4">
                  {loadingSyllabus ? (
                      <div className="flex items-center justify-center p-4 text-slate-500 gap-2 font-medium">
                          <Loader2 size={18} className="animate-spin" /> Accessing Syllabus Content...
                      </div>
                  ) : syllabusStructure.length > 0 ? (
                      <>
                        {/* Topic Selector */}
                        <div className="relative">
                           <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                              <Book size={14} className="text-emerald-500"/> Select Syllabus Topic
                           </label>
                           <select 
                               className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                               value={formData.topic}
                               onChange={(e) => setFormData({ ...formData, topic: e.target.value, lessonTitle: "" })}
                           >
                               <option value="">-- Choose a Topic --</option>
                               {syllabusStructure.map((t: any, idx) => (
                                   <option key={idx} value={t.title || t.topic}>{t.title || t.topic}</option>
                               ))}
                           </select>
                           <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Subtopic Selector */}
                        {formData.topic && (
                           <div className="relative animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Select Subtopic</label>
                                <select 
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.lessonTitle}
                                    onChange={(e) => setFormData({ ...formData, lessonTitle: e.target.value })}
                                >
                                    <option value="">-- Choose Subtopic --</option>
                                    {currentSubtopics.map((sub: string, idx: number) => (
                                        <option key={idx} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-10 text-slate-400 pointer-events-none" />
                           </div>
                        )}
                      </>
                  ) : (
                      <div className="text-xs text-slate-600 font-medium p-3 border border-dashed border-slate-300 bg-slate-50 rounded">
                          Syllabus content not found. Please type manually below.
                      </div>
                  )}
              </div>
           )}
           
           {/* C. MANUAL INPUTS (Fallback) */}
           {showManualTopic && (
               <>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        {(type === 'weekly' || type === 'record') ? "Main Topic" : "Main Topic"}
                      </label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#6c2dc7] focus:ring-1 focus:ring-[#6c2dc7] transition-colors"
                        placeholder={(type === 'weekly' || type === 'record') ? "e.g. Algebra" : "e.g. Unit 4.1: Algebra"}
                        value={formData.topic || ''} 
                        onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      />
                  </div>
                  
                  {/* 🆕 EXPLICIT SUB-TOPIC LOGIC: Shows for Schemes automatically, or if showLessonTitle is true */}
                  {(type === 'scheme' || showLessonTitle) && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-bold text-slate-700 mb-1">
                             {type === 'scheme' ? 'Specific Sub-topic (Optional)' : 'Sub-topic / Lesson Title'}
                          </label>
                          <input 
                              type="text" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-[#6c2dc7] focus:ring-1 focus:ring-[#6c2dc7] transition-colors"
                              placeholder={type === 'scheme' ? "e.g. Solving Linear Equations" : "e.g. Solving Linear Equations (Unit 4.1)"}
                              value={formData.lessonTitle || formData.subtopic || ''} 
                              onChange={(e) => setFormData({
                                  ...formData, 
                                  lessonTitle: e.target.value, 
                                  subtopic: e.target.value
                              })}
                          />
                      </div>
                  )}
               </>
           )}
         </div>
      )}
    </div>
  );
};

export default ModalFormBody;