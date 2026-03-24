import { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, updateDoc } from 'firebase/firestore'; 
import { ModalType } from './modals/types';
import ModalHeader from './modals/ModalHeader';
import ModalFooter from './modals/ModalFooter';
import ModalFormBody from './modals/ModalFormBodyCode';

// --- TYPES & INTERFACES ---
interface GenerationModalProps {
  isOpen: boolean;
  type: ModalType | 'exam' | 'catchup' | any; 
  onClose: () => void;
  onGenerate: (data: any) => void;
}

interface UserProfile {
  name?: string;
  fullName?: string;
  schoolName?: string;
  school?: string;
}

interface SchoolProfile {
  schoolName?: string;
  name?: string;
  branding?: { logo_url?: string };
  logoUrl?: string;
}

// ⚡️ CONFIGURATION
const PHASING_OUT_GRADES = ["10", "11", "12", "Grade 10", "Grade 11", "Grade 12", "Form 3", "Form 4", "Form 5"];
const SYLLABUS_BROWSING_GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Grade 10", "Grade 11", "Grade 12"];

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

export default function GenerationModal({ isOpen, type, onClose, onGenerate }: GenerationModalProps) {
  
  // --- UNIFIED FORM STATE ---
  const [formData, setFormData] = useState({
    teacherName: '', school: '', term: 'Term 1', subject: '', grade: '',
    weeks: 13, weekNumber: 1, days: 5, 
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00', endTime: '08:40', boys: 0, girls: 0,
    topic: '', lessonTitle: '', objectives: [] as string[],
    schemeContent: [] as string[], references: '' as string, lessonId: '',
    bloomsLevel: '',
    schoolLogo: '',
    // EXAM & SCHEME FIELDS
    topics: [] as string[],
    blueprint: { mcq: 10, 
        true_false: 0, 
        matching: 0, 
        short_answer: 5, 
        computational: 0, 
        essay: 2, 
        case_study: 0 },
    // CATCH-UP FIELDS
    catchupLevel: '',
    catchupSteps: [] as string[],
    catchupMaterials: [] as string[]
  });

  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [gradeWarning, setGradeWarning] = useState<string | null>(null);
  
  // --- FLYWHEEL STATES ---
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [availableDays, setAvailableDays] = useState<any[]>([]); // Days from Weekly Plans
  const [selectedDayIndex, setSelectedDayIndex] = useState<string>("");
  
  const [loadingFlywheel, setLoadingFlywheel] = useState(false);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]); // Saved Lesson Plans (for Records)
  const [schemeDataRows, setSchemeDataRows] = useState<any[]>([]); // Saved Schemes (for Weekly Plans)

  const [syllabusStructure, setSyllabusStructure] = useState<any[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);

  // --- 🆕 CATCH-UP STATES ---
  const [catchupData, setCatchupData] = useState<any>(null); 
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);

  const isSyllabusGrade = type === 'lesson' && SYLLABUS_BROWSING_GRADES.includes(formData.grade);

  // 1️⃣ INITIALIZE ON OPEN 
  useEffect(() => {
    if (isOpen) {
       setAvailableDays([]); 
       setSelectedDayIndex(""); 
       setSubjectOptions([]); 
       setSyllabusStructure([]); 
       setGradeWarning(null);
       setSchemeDataRows([]); 
       setAvailableLessons([]);
       
       const initializeForm = async () => {
           const user = auth.currentUser;
           const storedSchoolId = localStorage.getItem('schoolId'); 
           
           let resolvedSchoolName = "";
           let resolvedSchoolLogo = ""; 
           let resolvedTeacherName = "";

           try {
               // A. Fetch School Profile
               if (storedSchoolId && storedSchoolId !== "undefined" && storedSchoolId !== "null") {
                   const schoolDoc = await getDoc(doc(db, "schools", storedSchoolId));
                   if (schoolDoc.exists()) {
                       const sData = schoolDoc.data() as SchoolProfile;
                       resolvedSchoolName = sData.schoolName || sData.name || "";
                       resolvedSchoolLogo = sData.branding?.logo_url || sData.logoUrl || "";
                   } 
               } 

               // B. Fetch User Profile
               if (user) {
                   const userDoc = await getDoc(doc(db, "users", user.uid));
                   if (userDoc.exists()) {
                       const userData = userDoc.data() as UserProfile;
                       resolvedTeacherName = userData.name || userData.fullName || "";
                       if (!resolvedSchoolName) {
                           resolvedSchoolName = userData.schoolName || userData.school || "";
                       }
                   }
               }

               // C. Update State
               setFormData(prev => ({ 
                   ...prev, 
                   teacherName: type === 'lesson' ? "____________________" : (resolvedTeacherName || prev.teacherName), 
                   school: resolvedSchoolName || prev.school, 
                   schoolLogo: resolvedSchoolLogo, 
                   startDate: new Date().toISOString().split('T')[0],
                   bloomsLevel: "",
                   topics: [], 
                   blueprint: { mcq: 10, true_false: 0, matching: 0, short_answer: 5, computational: 0, essay: 2, case_study: 0 },
                   catchupLevel: '',
                   catchupSteps: [],
                   catchupMaterials: []
               }));

           } catch (e) { 
               console.error("🔥 Critical Error initializing form:", e); 
           }
       };

       initializeForm();
    }
  }, [isOpen, type]);

  // 2️⃣ FETCH SUBJECTS
  useEffect(() => {
    const fetchSubjects = async () => {
        const gradeInput = formData.grade.trim();
        if (!gradeInput) { setSubjectOptions([]); setGradeWarning(null); return; }

        if (PHASING_OUT_GRADES.includes(gradeInput)) setGradeWarning(`Note: ${gradeInput} syllabus is currently phasing out.`);
        else setGradeWarning(null);

        setLoadingSubjects(true);
        try {
            const response = await fetch(`${API_BASE}/api/v1/get-subjects/${encodeURIComponent(gradeInput)}`);
            if (response.ok) {
                const data = await response.json();
                setSubjectOptions(data.subjects && Array.isArray(data.subjects) ? data.subjects : []);
            } else { setSubjectOptions([]); }
        } catch (error) { 
            console.error("Error fetching subjects:", error); 
            setSubjectOptions([]); 
        } finally { 
            setLoadingSubjects(false); 
        }
    };
    const timeoutId = setTimeout(fetchSubjects, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.grade]);

  // 3️⃣ FETCH SYLLABUS TOPICS
  useEffect(() => {
    const fetchSyllabusTopics = async () => {
        // Only block fetching if it's strictly a lesson plan AND not a syllabus grade. 
        // For exams and schemes, we ALWAYS want to fetch the syllabus.
        if ((!isSyllabusGrade && type === 'lesson') || !formData.subject) { 
            setSyllabusStructure([]); 
            return; 
        }
        
        setLoadingSyllabus(true);
        try {
            const response = await fetch(`${API_BASE}/api/v1/get-syllabus-topics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grade: formData.grade, subject: formData.subject, country: "Zambia" })
            });
            if (response.ok) {
                const data = await response.json();
                setSyllabusStructure(data.topics || data.units || []);
            } else { setSyllabusStructure([]); }
        } catch (error) { 
            console.error("Error fetching syllabus structure:", error); 
            setSyllabusStructure([]); 
        } finally { 
            setLoadingSyllabus(false); 
        }
    };
    const debounce = setTimeout(fetchSyllabusTopics, 600);
    return () => clearTimeout(debounce);
  }, [formData.grade, formData.subject, type, isSyllabusGrade]);

  // 4️⃣ THE AI FLYWHEEL (Fetch Upstream Documents based on Modal Type)
  useEffect(() => {
    const fetchFlywheelData = async () => {
        if (!formData.grade || !formData.subject || !formData.term) return;
        const user = auth.currentUser; 
        if (!user) return;

        setLoadingFlywheel(true);
        const inputSubject = formData.subject.toLowerCase().trim();
        const inputGrade = formData.grade.toLowerCase().trim();

        try {
            // A. SCHEMES (Feeds into Weekly Plans)
            if (type === 'weekly' || type === 'record') {
                const schemesRef = collection(db, "generated_schemes");
                const q = query(schemesRef, where("userId", "==", user.uid), where("term", "==", formData.term), orderBy("createdAt", "desc"), limit(10));
                const snapshot = await getDocs(q);
                
                const matchedScheme = snapshot.docs.find(doc => {
                    const data = doc.data();
                    const dbSubject = (data.subject || "").toLowerCase();
                    const dbGrade = (data.grade || "").toLowerCase();
                    return dbSubject.includes(inputSubject) && dbGrade.includes(inputGrade);
                });

                if (matchedScheme) {
                    const docData = matchedScheme.data();
                    const rows = docData.schemeData?.rows || docData.schemeData || docData.weeks || [];
                    setSchemeDataRows(rows);

                    const targetWeekNum = parseInt(formData.weekNumber.toString());
                    const weekItem = rows.find((w: any) => w.week_number === targetWeekNum || String(w.week).includes(String(targetWeekNum)));
                    
                    if (weekItem) {
                        const outcomesStr = weekItem.outcomes ? (Array.isArray(weekItem.outcomes) ? weekItem.outcomes[0] : weekItem.outcomes) : null;
                        const subtopicStr = weekItem.subtopic;
                        const contentStr = weekItem.content ? (Array.isArray(weekItem.content) ? weekItem.content[0] : weekItem.content) : null;
                        const autoSubtopic = outcomesStr || subtopicStr || contentStr || `Week ${targetWeekNum}`;

                        setFormData(prev => ({ 
                            ...prev, 
                            topic: weekItem.topic || (weekItem.content && weekItem.content[0]) || prev.topic, 
                            lessonTitle: autoSubtopic, 
                            objectives: weekItem.outcomes || weekItem.content || weekItem.specific_competences || [], 
                            schemeContent: weekItem.content || [], 
                            references: Array.isArray(weekItem.references) ? weekItem.references.join('\n') : String(weekItem.references || "")
                        }));
                    }
                } else {
                    setSchemeDataRows([]);
                }
            }

            // B. WEEKLY PLANS (Feeds into Lesson Plans)
            if (type === 'lesson') {
                const weeklyRef = collection(db, "generated_weekly_plans");
                const q = query(weeklyRef, where("userId", "==", user.uid), where("term", "==", formData.term), orderBy("createdAt", "desc"), limit(15));
                const snapshot = await getDocs(q);
                
                let allDays: any[] = [];
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if ((data.subject || "").toLowerCase().includes(inputSubject) && (data.grade || "").toLowerCase().includes(inputGrade)) {
                        if (data.planData && data.planData.days) {
                            allDays = [...allDays, ...data.planData.days.map((d: any) => ({ ...d, sourceWeek: data.weekNumber }))];
                        }
                    }
                });
                setAvailableDays(allDays);
            }

            // C. LESSON PLANS (Feeds into Lesson Records)
            if (type === 'record') {
                const lessonsRef = collection(db, "generated_lesson_plans");
                const q = query(lessonsRef, where("userId", "==", user.uid), where("term", "==", formData.term), orderBy("createdAt", "desc"), limit(20));
                const snapshot = await getDocs(q);
                
                const matchedLessons = snapshot.docs
                    .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
                    .filter(data => (data.subject || "").toLowerCase().includes(inputSubject) && (data.grade || "").toLowerCase().includes(inputGrade));
                
                setAvailableLessons(matchedLessons);
            }

        } catch (error) { 
            console.error("❌ [Flywheel] Error fetching upstream data:", error); 
        } finally {
            setLoadingFlywheel(false);
        }
    };

    const timer = setTimeout(fetchFlywheelData, 800); 
    return () => clearTimeout(timer);
  }, [formData.grade, formData.subject, formData.term, formData.weekNumber, type]);

// 5️⃣ 🆕 CATCH-UP LOGIC: Fetch Levels and Activities
  useEffect(() => {
    if (type === 'catchup' && formData.subject) {
        const fetchCatchupData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/catchup/${formData.subject.toLowerCase()}`);
                if (res.ok) {
                    const data = await res.json();
                    
                    const normalizedData: Record<string, any[]> = {};
                    const rootData = data.levels || data.activities || data.data || data;

                    if (Array.isArray(rootData)) {
                        rootData.forEach((item: any) => {
                            const lvlName = item.level || item.level_name || item.name || "Unknown Level";
                            const acts = item.activities || item.items || item.lessons || [];
                            if (lvlName) normalizedData[lvlName] = acts;
                        });
                    } else if (typeof rootData === 'object') {
                        Object.keys(rootData).forEach(key => {
                            normalizedData[key] = rootData[key];
                        });
                    }

                    setCatchupData(normalizedData);
                    
                    const levels = Object.keys(normalizedData).filter(key => 
                        key.toLowerCase() !== 'all levels' && 
                        key.toLowerCase() !== 'meta' &&
                        key.toLowerCase() !== 'subject'
                    );
                    
                    setAvailableLevels(levels);
                    
                    setFormData(prev => ({ 
                        ...prev, 
                        grade: 'Catch-Up', 
                        catchupLevel: '', 
                        lessonTitle: '', 
                        catchupSteps: [], 
                        catchupMaterials: [] 
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch catchup data", error);
            }
        };
        fetchCatchupData();
    }
  }, [formData.subject, type]);

  // 6️⃣ 🆕 CATCH-UP LOGIC: Merge All Levels & Specific Level Activities
  useEffect(() => {
    if (type === 'catchup' && formData.catchupLevel && catchupData) {
        
        let allLevelsActivities: any[] = [];
        Object.keys(catchupData).forEach(key => {
            if (key.toLowerCase() === 'all levels' && Array.isArray(catchupData[key])) {
                allLevelsActivities = catchupData[key];
            }
        });

        let specificLevelActivities = catchupData[formData.catchupLevel];
        if (!Array.isArray(specificLevelActivities)) {
            specificLevelActivities = [];
        }

        const combinedActivities = [
            ...allLevelsActivities.map((act: any) => ({ ...act, labelTag: 'General' })),
            ...specificLevelActivities.map((act: any) => ({ ...act, labelTag: formData.catchupLevel }))
        ];

        setAvailableActivities(combinedActivities);
    }
  }, [formData.catchupLevel, catchupData, type]);

  // --- HANDLERS ---

  const fetchWeeklyPlanAPI = async () => {
    if (!formData.grade || !formData.subject || !formData.weekNumber) { alert("Please enter details first."); return; }
    setLoadingPlan(true); 
    const user = auth.currentUser; if (!user) return;
    try {
        const response = await fetch(`${API_BASE}/api/v1/get-weekly-plan`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
            body: JSON.stringify({ grade: formData.grade, subject: formData.subject, term: formData.term, weekNumber: parseInt(formData.weekNumber.toString()) })
        });
        if (response.ok) {
            const planData = await response.json();
            if (planData && Array.isArray(planData.days)) {
                setAvailableDays(planData.days);
                setFormData(prev => ({ ...prev, school: planData.school || prev.school, term: planData.meta?.term || prev.term, topic: planData.meta?.main_topic || prev.topic }));
            }
        }
    } catch (error) { console.error("Error fetching API plan:", error); } finally { setLoadingPlan(false); }
  };

  const handleDaySelect = (indexStr: string) => {
      setSelectedDayIndex(indexStr); 
      const idx = parseInt(indexStr);
      if (!isNaN(idx) && availableDays[idx]) {
          const dayData = availableDays[idx];
          setFormData(prev => ({
              ...prev, 
              topic: dayData.topic || formData.topic, 
              lessonTitle: dayData.subtopic || "", 
              objectives: dayData.specific_competence ? [dayData.specific_competence] : (dayData.objectives || []), 
              startDate: type === 'lesson' ? prev.startDate : (dayData.date || prev.startDate)
          }));
      }
  };

  const handleLessonSelect = (lessonId: string) => {
      const selectedLesson = availableLessons.find(l => l.id === lessonId);
      if (selectedLesson) {
          setFormData(prev => ({
              ...prev,
              lessonId,
              topic: selectedLesson.topic || prev.topic,
              lessonTitle: selectedLesson.lessonTitle || selectedLesson.subtopic || prev.lessonTitle
          }));
      } else {
          setFormData(prev => ({ ...prev, lessonId }));
      }
  };

  const handleGenerateClick = async () => {
    // 🛑 VALIDATION LOGIC 🛑
    if ((type === 'weekly' || type === 'record') && !formData.topic?.trim()) { alert("Topic is missing!"); return; }
    if (type === 'lesson') {
         if (!formData.topic) { alert("Please select a Topic."); return; }
         if (isSyllabusGrade && !formData.lessonTitle) { alert("Please select a Subtopic."); return; }
    }
    
    // EXAM VALIDATION
    if (type === 'exam' && (!formData.topics || formData.topics.length === 0)) {
         alert("Please select at least one topic for the exam."); 
         return;
    }

    // 🆕 SCHEME VALIDATION (Ensure topics are selected if syllabus exists)
    if (type === 'scheme' && syllabusStructure.length > 0 && (!formData.topics || formData.topics.length === 0)) {
         alert("Please select at least one topic for the Scheme of Work."); 
         return;
    }

    // CATCH-UP VALIDATION
    if (type === 'catchup') {
        if (!formData.subject) {
            alert("Please type or select a subject (e.g., Numeracy or Literacy).");
            return;
        }
        if (!formData.catchupLevel) {
            alert("Please select a Target Catch-Up Level.");
            return;
        }
        if (!formData.lessonTitle) { 
            alert("Please select an Activity.");
            return;
        }
    }

    // ⚡️ Self-Healing: Update user profile with school name if missing
    const user = auth.currentUser;
    const currentSchoolId = localStorage.getItem('schoolId');

    if (user && formData.school && (!currentSchoolId || currentSchoolId === "undefined")) {
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                schoolName: formData.school,
                school: formData.school 
            });
        } catch (e) {
            console.warn("⚠️ Could not auto-save school name to profile:", e);
        }
    }

    onGenerate(formData);
  };

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#ffa500]/20 w-full max-w-lg rounded-3xl shadow-[0_8px_30px_rgba(255,165,0,0.15)] overflow-hidden animate-in fade-in zoom-in duration-200">
        <ModalHeader type={type} onClose={onClose} />
        
        <ModalFormBody 
            type={type} 
            formData={formData} 
            setFormData={setFormData}
            loadingSubjects={loadingSubjects}
            subjectOptions={subjectOptions}
            gradeWarning={gradeWarning}
            isSyllabusGrade={isSyllabusGrade}
            syllabusStructure={syllabusStructure}
            loadingSyllabus={loadingSyllabus}
            loadingPlan={loadingPlan}
            fetchWeeklyPlan={fetchWeeklyPlanAPI}
            availableDays={availableDays}
            selectedDayIndex={selectedDayIndex}
            handleDaySelect={handleDaySelect}
            loadingLessons={loadingFlywheel} 
            availableLessons={availableLessons} 
            selectedLessonId={formData.lessonId} 
            handleLessonSelect={handleLessonSelect}
            schemes={schemeDataRows} 
            availableLevels={availableLevels}
            availableActivities={availableActivities}
        />

        <ModalFooter 
            type={type} 
            onClose={onClose} 
            onGenerate={handleGenerateClick} 
            disabled={
                ((type === 'weekly' || type === 'record') && !formData.topic) || 
                (type === 'lesson' && !formData.topic) ||
                (type === 'exam' && formData.topics.length === 0) ||
                (type === 'scheme' && syllabusStructure.length > 0 && formData.topics.length === 0) || // 👈 Enabled Scheme Topics Validation
                (type === 'catchup' && (!formData.catchupLevel || !formData.lessonTitle)) 
            }
        />
      </div>
    </div>
  );
}