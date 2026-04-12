import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc } from 'firebase/firestore'; 
import { ModalType } from './types';

// Configuration
const PHASING_OUT_GRADES = ["10", "11", "12", "Grade 10", "Grade 11", "Grade 12", "Form 3", "Form 4", "Form 5"];
const SYLLABUS_BROWSING_GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Grade 10", "Grade 11", "Grade 12"];

const API_BASE = import.meta.env?.VITE_API_BASE || 
  (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://web-76nr.onrender.com');

// --- Types & Interfaces ---
interface Blueprint {
  mcq: number; true_false: number; matching: number; short_answer: number; 
  computational: number; essay: number; case_study: number;
}

export interface GenerationFormData {
  teacherName: string; school: string; term: string; subject: string; grade: string;
  weeks: number; weekNumber: number; days: number; 
  startDate: string; startTime: string; endTime: string; boys: number; girls: number;
  topic: string; lessonTitle: string; objectives: string[];
  schemeContent: string[]; references: string; lessonId: string;
  bloomsLevel: string; schoolLogo: string;
  topics: string[]; subtopics: string[]; 
  blueprint: Blueprint;
  catchupLevel: string; catchupSteps: string[]; catchupMaterials: string[];
}

interface DayData {
  topic?: string; subtopic?: string; lessonTitle?: string; title?: string;
  objectives?: string | string[]; specific_competences?: string | string[]; specific_competence?: string | string[];
}

interface LessonData {
  id: string; topic?: string; lessonTitle?: string; subtopic?: string;
}

interface SchemeRow {
  week_number?: number; week?: string; topic?: string; subtopic?: string;
  content?: string[]; outcomes?: string[]; references?: string | string[];
}

export const useGenerationModalLogic = (isOpen: boolean, type: ModalType, onGenerate: (data: GenerationFormData) => void) => {
  const [formData, setFormData] = useState<GenerationFormData>({
    teacherName: '', school: '', term: 'Term 1', subject: '', grade: '',
    weeks: 13, weekNumber: 1, days: 5, 
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00', endTime: '08:40', boys: 0, girls: 0,
    topic: '', lessonTitle: '', objectives: [],
    schemeContent: [], references: '', lessonId: '',
    bloomsLevel: '', schoolLogo: '',
    topics: [], subtopics: [], 
    blueprint: { mcq: 10, true_false: 0, matching: 0, short_answer: 5, computational: 0, essay: 2, case_study: 0 },
    catchupLevel: '', catchupSteps: [], catchupMaterials: []
  });

  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [gradeWarning, setGradeWarning] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [availableDays, setAvailableDays] = useState<DayData[]>([]); 
  const [selectedDayIndex, setSelectedDayIndex] = useState<string>("");
  const [loadingFlywheel, setLoadingFlywheel] = useState(false);
  const [availableLessons, setAvailableLessons] = useState<LessonData[]>([]); 
  const [schemeDataRows, setSchemeDataRows] = useState<SchemeRow[]>([]); 
  const [syllabusStructure, setSyllabusStructure] = useState<any[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [catchupData, setCatchupData] = useState<Record<string, any[]>>({}); 
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);

  const isSyllabusGrade = type === 'lesson' && SYLLABUS_BROWSING_GRADES.includes(formData.grade);

  // 1. Initial Load
  useEffect(() => {
    if (!isOpen) return;

    console.log(`🛠️ [Modal] Opening modal for type: ${type}`);
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
           if (storedSchoolId && storedSchoolId !== "undefined" && storedSchoolId !== "null") {
               const schoolDoc = await getDoc(doc(db, "schools", storedSchoolId));
               if (schoolDoc.exists()) {
                   const sData = schoolDoc.data();
                   resolvedSchoolName = sData.schoolName || sData.name || "";
                   resolvedSchoolLogo = sData.branding?.logo_url || sData.logoUrl || "";
               } 
           } 

           if (user) {
               const userDoc = await getDoc(doc(db, "users", user.uid));
               if (userDoc.exists()) {
                   const userData = userDoc.data();
                   resolvedTeacherName = userData.name || userData.fullName || "";
                   if (!resolvedSchoolName) resolvedSchoolName = userData.schoolName || userData.school || "";
               }
           }

           setFormData(prev => ({ 
               ...prev, 
               teacherName: type === 'lesson' ? "____________________" : (resolvedTeacherName || prev.teacherName), 
               school: resolvedSchoolName || prev.school, 
               schoolLogo: resolvedSchoolLogo, 
               startDate: new Date().toISOString().split('T')[0],
               bloomsLevel: "",
               topics: [], subtopics: [],
               blueprint: { mcq: 10, true_false: 0, matching: 0, short_answer: 5, computational: 0, essay: 2, case_study: 0 },
               catchupLevel: '', catchupSteps: [], catchupMaterials: []
           }));
       } catch (e) { 
           console.error("Error initializing form:", e); 
       }
    };
    
    initializeForm();
  }, [isOpen, type]);

  // 2. Fetch Subjects
  useEffect(() => {
    const fetchSubjects = async () => {
        const gradeInput = formData.grade.trim();
        if (!gradeInput) { 
            setSubjectOptions([]); 
            setGradeWarning(null); 
            return; 
        }

        console.log(`📚 [Subjects] Fetching options for Grade: ${gradeInput}`);
        setGradeWarning(
            PHASING_OUT_GRADES.includes(gradeInput) 
            ? `Note: ${gradeInput} syllabus is currently phasing out.` 
            : null
        );

        setLoadingSubjects(true);
        try {
            const response = await fetch(`${API_BASE}/api/v1/get-subjects/${encodeURIComponent(gradeInput)}`);
            if (response.ok) {
                const data = await response.json();
                setSubjectOptions(data.subjects || []);
            }
        } catch (error) { 
            console.error("Error fetching subjects:", error); 
        } finally { 
            setLoadingSubjects(false); 
        }
    };

    const timeoutId = setTimeout(fetchSubjects, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.grade]);

  // 3. Syllabus Topics
  useEffect(() => {
    const fetchSyllabusTopics = async () => {
        if ((!isSyllabusGrade && type === 'lesson') || !formData.subject) { 
            setSyllabusStructure([]); 
            return; 
        }
        
        console.log(`📖 [Syllabus] Browsing structure for ${formData.subject} (${formData.grade})`);
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
            }
        } catch (error) { 
            console.error("Syllabus fetch error:", error); 
        } finally { 
            setLoadingSyllabus(false); 
        }
    };

    const debounce = setTimeout(fetchSyllabusTopics, 600);
    return () => clearTimeout(debounce);
  }, [formData.grade, formData.subject, type, isSyllabusGrade]);

  // 4. AI Flywheel (Matching)
  useEffect(() => {
    const fetchFlywheelData = async () => {
      if (!formData.grade || !formData.subject || !formData.term) return;
      const user = auth.currentUser;
      if (!user) return;

      setLoadingFlywheel(true);

      const normalizeGrade = (g: string) => String(g).toLowerCase().replace(/grade|form|\s/g, '');
      const inputSubject = formData.subject.toLowerCase().replace('&', 'and').trim();
      const inputGradeFixed = normalizeGrade(formData.grade);
      const targetWeekNum = parseInt(formData.weekNumber.toString(), 10);

      console.log(`🔍 [Flywheel] Searching for: ${inputSubject} | Grade: ${inputGradeFixed} | Week: ${targetWeekNum}`);

      try {
        // --- A. WEEKLY / RECORD: Pull from Schemes ---
        if (type === 'weekly' || type === 'record') {
          const flywheelRef = collection(db, "ai_training_flywheel");
          const q = query(flywheelRef, where("uid", "==", user.uid), where("term", "==", formData.term), limit(20));
          const snapshot = await getDocs(q);

          const matchedDoc = snapshot.docs.find((docSnap) => {
            const data = docSnap.data();
            const dbSubject = (data.subject || "").toLowerCase().replace('&', 'and').trim();
            const dbGrade = normalizeGrade(data.grade || "");
            const isScheme = String(data.plan_type || "").includes("scheme");

            return isScheme && (dbSubject.includes(inputSubject) || inputSubject.includes(dbSubject)) && dbGrade === inputGradeFixed;
          });

          if (matchedDoc) {
            const docData = matchedDoc.data();
            console.log("✅ [Flywheel] Found Edited Scheme Document:", matchedDoc.id);

            const rows: SchemeRow[] = docData.final_human_data?.rows || docData.rows || [];
            setSchemeDataRows(rows);

            const weekItem = rows.find((w) => {
              const rowWeekNum = w.week_number || (w.week ? parseInt(String(w.week).replace(/\D/g, ''), 10) : null);
              return rowWeekNum === targetWeekNum;
            });

            if (weekItem) {
              console.log(`📅 [Flywheel] Auto-filling from Scheme Week ${targetWeekNum}`);
              setFormData((prev) => ({
                ...prev,
                topic: weekItem.topic || (weekItem.content && weekItem.content[0]) || prev.topic,
                lessonTitle: weekItem.subtopic || weekItem.outcomes?.[0] || prev.lessonTitle,
                objectives: Array.isArray(weekItem.outcomes) ? weekItem.outcomes : (weekItem.content || []),
                schemeContent: weekItem.content || [],
                references: Array.isArray(weekItem.references) ? weekItem.references.join('\n') : String(weekItem.references || "")
              }));
            }
          } else {
            console.log("❌ [Flywheel] No edited Schemes found for this subject/grade.");
          }
        }

        // --- B. LESSON PLAN: Pull from Weekly Plans ---
        if (type === 'lesson') {
            const flywheelRef = collection(db, "ai_training_flywheel");
            const q = query(flywheelRef, where("uid", "==", user.uid), where("term", "==", formData.term), limit(20));
            const snapshot = await getDocs(q);

            const matchedWeekly = snapshot.docs.find((docSnap) => {
                const data = docSnap.data();
                const dbSubject = (data.subject || "").toLowerCase().replace('&', 'and').trim();
                const dbGrade = normalizeGrade(data.grade || "");
                const docWeek = parseInt(String(data.week || data.week_number || data.weekNumber || "0").replace(/\D/g, ''), 10);
                const isWeekly = String(data.plan_type || "").includes("weekly");

                return isWeekly && dbGrade === inputGradeFixed && (dbSubject.includes(inputSubject) || inputSubject.includes(dbSubject)) && docWeek === targetWeekNum;
            });

            if (matchedWeekly) {
                const docData = matchedWeekly.data();
                const days = docData.final_human_data?.days || docData.planData?.days || docData.days || [];
                console.log(`✅ [Flywheel] Auto-loaded ${days.length} Lesson Days from Verified Weekly Plan.`);
                setAvailableDays(days);
            } else {
                console.log("ℹ️ [Flywheel] Checking unedited generated_weekly_plans...");
                const rawRef = collection(db, "generated_weekly_plans");
                const rawQ = query(rawRef, where("userId", "==", user.uid), where("term", "==", formData.term), limit(15));
                const rawSnap = await getDocs(rawQ);

                const rawMatched = rawSnap.docs.find((docSnap) => {
                    const data = docSnap.data();
                    const dbSubject = (data.subject || "").toLowerCase().replace('&', 'and').trim();
                    const dbGrade = normalizeGrade(data.grade || "");
                    const docWeek = parseInt(String(data.week || data.week_number || data.weekNumber || "0").replace(/\D/g, ''), 10);

                    return dbGrade === inputGradeFixed && (dbSubject.includes(inputSubject) || inputSubject.includes(dbSubject)) && docWeek === targetWeekNum;
                });

                if (rawMatched) {
                    const docData = rawMatched.data();
                    const days = docData.planData?.days || docData.days || [];
                    console.log(`✅ [Flywheel] Auto-loaded ${days.length} Lesson Days from Raw Weekly Plan.`);
                    setAvailableDays(days);
                } else {
                    console.log(`❌ [Flywheel] No Weekly Plan found for Week ${targetWeekNum} to map to Lesson.`);
                    setAvailableDays([]);
                }
            }
        }
      } catch (error) {
        console.error("Flywheel Error:", error);
      } finally {
        setLoadingFlywheel(false);
      }
    };

    const timer = setTimeout(fetchFlywheelData, 800);
    return () => clearTimeout(timer);
  }, [formData.grade, formData.subject, formData.term, formData.weekNumber, type]);

  // 5. Catch-up Logic
  useEffect(() => {
    if (type !== 'catchup' || !formData.subject) return;

    const fetchCatchupData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/catchup/${formData.subject.toLowerCase()}`);
            if (res.ok) {
                const data = await res.json();
                const normalized: Record<string, any[]> = {};
                const rootData = data.levels || data.activities || data;
                
                if (Array.isArray(rootData)) {
                    rootData.forEach((item) => {
                        const lvlName = item.level || item.level_name || item.name || "Unknown";
                        normalized[lvlName] = item.activities || item.items || [];
                    });
                }
                
                setCatchupData(normalized);
                setAvailableLevels(Object.keys(normalized).filter(k => !['meta', 'subject'].includes(k.toLowerCase())));
                setFormData(prev => ({ ...prev, grade: 'Catch-Up', catchupLevel: '', lessonTitle: '' }));
            }
        } catch (error) { 
            console.error("Catchup fetch failed", error); 
        }
    };
    
    fetchCatchupData();
  }, [formData.subject, type]);

  useEffect(() => {
    if (type === 'catchup' && formData.catchupLevel && Object.keys(catchupData).length > 0) {
        const combined = [
            ...(catchupData['all levels'] || []).map(a => ({ ...a, labelTag: 'General' })),
            ...(catchupData[formData.catchupLevel] || []).map(a => ({ ...a, labelTag: formData.catchupLevel }))
        ];
        setAvailableActivities(combined);
    }
  }, [formData.catchupLevel, catchupData, type]);

  // --- Handlers ---
  const fetchWeeklyPlanAPI = async () => {
    if (!formData.grade || !formData.subject || !formData.weekNumber) return;
    
    const user = auth.currentUser; 
    if (!user) return;

    setLoadingPlan(true); 
    try {
        const response = await fetch(`${API_BASE}/api/v1/get-weekly-plan`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'X-User-ID': user.uid },
            body: JSON.stringify({ 
                grade: formData.grade, 
                subject: formData.subject, 
                term: formData.term, 
                weekNumber: parseInt(formData.weekNumber.toString(), 10) 
            })
        });
        
        if (response.ok) {
            const planData = await response.json();
            if (Array.isArray(planData.days)) {
                setAvailableDays(planData.days);
                setFormData(prev => ({ ...prev, topic: planData.meta?.main_topic || prev.topic }));
            }
        }
    } catch (error) { 
        console.error("Failed to fetch weekly plan API:", error); 
    } finally { 
        setLoadingPlan(false); 
    }
  };

  const handleDaySelect = (indexStr: string) => {
      setSelectedDayIndex(indexStr); 
      const dayData = availableDays[parseInt(indexStr, 10)];
      
      if (dayData) {
          console.log("📅 [Day Selected] Mapping objectives for day:", dayData);
          
          const rawObjectives = dayData.objectives || dayData.specific_competences || dayData.specific_competence;
          const extObjectives = Array.isArray(rawObjectives) ? rawObjectives : (rawObjectives ? [rawObjectives] : []);
          
          setFormData(prev => ({
              ...prev, 
              topic: dayData.topic || prev.topic, 
              lessonTitle: dayData.subtopic || dayData.lessonTitle || dayData.title || "", 
              objectives: extObjectives as string[]
          }));
      }
  };

  const handleLessonSelect = (lessonId: string) => {
      const selected = availableLessons.find(l => l.id === lessonId);
      setFormData(prev => ({
          ...prev, 
          lessonId, 
          topic: selected?.topic || prev.topic,
          lessonTitle: selected?.lessonTitle || selected?.subtopic || prev.lessonTitle
      }));
  };

  const handleGenerateClick = async () => {
    if ((type === 'weekly' || type === 'record' || type === 'lesson') && !formData.topic) { 
        alert("Topic is missing. Please select or enter a topic."); 
        return; 
    }
    if (type === 'exam' && formData.topics.length === 0) { 
        alert("Please select at least one topic."); 
        return; 
    }
    
    const user = auth.currentUser;
    if (user && formData.school && !localStorage.getItem('schoolId')) {
        try { 
            await updateDoc(doc(db, "users", user.uid), { schoolName: formData.school }); 
        } catch(error) {
            console.error("Failed to update user's school name:", error);
        }
    }
    
    onGenerate(formData);
  };

  return {
    formData, setFormData, subjectOptions, loadingSubjects, gradeWarning, isSyllabusGrade, syllabusStructure, loadingSyllabus,
    loadingPlan, fetchWeeklyPlan: fetchWeeklyPlanAPI, availableDays, selectedDayIndex, handleDaySelect,
    loadingLessons: loadingFlywheel, availableLessons, selectedLessonId: formData.lessonId, handleLessonSelect,
    schemes: schemeDataRows, availableLevels, availableActivities, handleGenerateClick
  };
};