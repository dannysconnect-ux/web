import { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { doc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

const getCurriculumType = (grade: string): 'new' | 'old' => {
    if (!grade) return 'new';
    const oldGrades = ["3", "5", "6", "7", "10", "11", "12"];
    const normalized = grade.toString().trim().toLowerCase().replace(/[^0-9]/g, '');
    return oldGrades.includes(normalized) ? 'old' : 'new';
};

export const useTeacherDashboard = () => {
  const navigate = useNavigate();
  
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('teacherName') || "Teacher");
  const [schoolName, setSchoolName] = useState("My School"); 
  const [credits, setCredits] = useState<number | null>(null);
  
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  
  const [hasSchoolId, setHasSchoolId] = useState<boolean>(!!localStorage.getItem('schoolId'));
  
  const [loading, setLoading] = useState(true);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeModal, setActiveModal] = useState<any>(null);
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'lesson' | 'weekly' | 'scheme' | 'exam' | 'record' | 'catchup'>('all');

  useEffect(() => {
    let unsubscribeListeners: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const uid = user.uid;
      const storedSchoolId = localStorage.getItem('schoolId');
      const storedTeacherId = localStorage.getItem('teacherDocId');
      const storedLocalName = localStorage.getItem('teacherName');
      
      setHasSchoolId(!!storedSchoolId);

      const authName = user.displayName || storedLocalName;
      if (authName && teacherName === "Teacher") {
          setTeacherName(authName);
      }

      if (storedSchoolId && storedTeacherId) {
        const schoolSub = onSnapshot(doc(db, "schools", storedSchoolId), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCredits(data.credits ?? 0);
            setSchoolName(data.name || "School Portal");
            
            const exp = data.expires_at || data.expiresAt;
            setExpiresAt(exp?.toDate ? exp.toDate().toISOString() : (typeof exp === 'string' ? exp : null));

            if (data.logoUrl) {
                localStorage.setItem('schoolLogo', data.logoUrl);
            }
          }
        });
        unsubscribeListeners.push(schoolSub);

        getDoc(doc(db, "teachers", storedTeacherId)).then(snap => {
            if(snap.exists()) {
                const tData = snap.data();
                if (tData.name) setTeacherName(tData.name);
            }
        });
      } 
      else {
        const userSub = onSnapshot(doc(db, "users", uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const firestoreName = data.name || data.fullName;
            const bestName = firestoreName || user.displayName || storedLocalName || "Teacher";
            
            setTeacherName(bestName);
            setSchoolName(data.schoolName || "Global Academy");
            setCredits(data.credits ?? 3); 
            
            const exp = data.expires_at || data.expiresAt;
            setExpiresAt(exp?.toDate ? exp.toDate().toISOString() : (typeof exp === 'string' ? exp : null));
            
            if (data.logoUrl) {
                localStorage.setItem('schoolLogo', data.logoUrl);
            }
          }
        });
        unsubscribeListeners.push(userSub);
      }

      setLoading(false);
      fetchRecentDocs(uid);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeListeners.forEach(unsub => unsub()); 
    };
  }, [navigate]);

  const fetchRecentDocs = async (uid: string) => {
    try {
        const collectionsToFetch = [
            { name: "generated_schemes", type: "scheme" },
            { name: "generated_weekly_plans", type: "weekly" },
            { name: "generated_lesson_plans", type: "lesson" },
            { name: "generated_records_of_work", type: "record" },
            { name: "generated_exams", type: "exam" },
            { name: "generated_catchup", type: "catchup" }, 
            { name: "ai_training_flywheel", type: "flywheel" } 
        ];
        
        const queries = collectionsToFetch.map(c => getDocs(query(collection(db, c.name), where("uid", "==", uid))));
        const fallbackQueries = collectionsToFetch.map(c => getDocs(query(collection(db, c.name), where("userId", "==", uid))));
        
        const [resultsUid, resultsUserId] = await Promise.all([
            Promise.allSettled(queries),
            Promise.allSettled(fallbackQueries)
        ]);

        const docsMap = new Map();

        const processResults = (resultsArray: any[], _queryType: string) => {
            resultsArray.forEach((r: any, index) => {
                const collectionInfo = collectionsToFetch[index];
                
                if (r.status === 'fulfilled') {
                    const baseType = collectionInfo.type;
                    
                    r.value.docs.forEach((d: any) => {
                        const data = d.data();
                        
                        let docType = baseType;
                        let normalizedData = { ...data };

                        if (baseType === 'flywheel') {
                            const rawType = (data.plan_type || data.planType || data.type || "").toLowerCase();
                            const humanData = data.final_human_data || data.finalEditedData || {};
                            
                            if (humanData.columns) normalizedData.customColumns = humanData.columns;
                            if (humanData.isLocked !== undefined) normalizedData.isLocked = humanData.isLocked;

                            if (rawType.includes('scheme')) {
                                docType = 'scheme';
                                normalizedData.schemeData = humanData.rows || humanData || [];
                                normalizedData.introInfo = humanData.intro || null;
                            } else if (rawType.includes('weekly')) {
                                docType = 'weekly';
                                normalizedData.planData = humanData || {};
                            } else if (rawType.includes('lesson')) {
                                docType = 'lesson';
                                normalizedData.planData = humanData || {};
                            } else if (rawType.includes('record')) {
                                docType = 'record';
                                normalizedData.recordData = humanData || {};
                            } else if (rawType.includes('catchup')) { 
                                docType = 'catchup';
                                normalizedData.planData = humanData || {};
                            }

                            normalizedData.createdAt = data.captured_at || data.createdAt;
                            normalizedData.updatedAt = data.captured_at || data.updatedAt;
                        }

                        const docObj = { ...normalizedData, id: d.id, type: docType };
                        
                        const safeSubject = (data.subject || "").trim().toLowerCase();
                        const safeGrade = (data.grade || "").trim().toLowerCase();
                        const safeTerm = (data.term || "").trim().toLowerCase();
                        const safeWeek = data.week || data.weekNumber || data.week_number || "none";

                        const linkKey = data.docId || data.originalId || `${docType}_${safeSubject}_${safeGrade}_${safeTerm}_${safeWeek}`;
                        
                        const existingDoc = docsMap.get(linkKey);
                        const currentTimestamp = docObj.updatedAt?.seconds || docObj.createdAt?.seconds || 0;
                        const existingTimestamp = existingDoc ? (existingDoc.updatedAt?.seconds || existingDoc.createdAt?.seconds || 0) : -1;

                        if (!existingDoc) {
                            docsMap.set(linkKey, docObj);
                        } else if (currentTimestamp > existingTimestamp) {
                            docsMap.set(linkKey, docObj);
                        } 
                    });
                }
            });
        };

        processResults(resultsUid, "uid");
        processResults(resultsUserId, "userId");

        const finalDocs = Array.from(docsMap.values())
            .sort((a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0));

        setRecentDocs(finalDocs);

    } catch (error) {
        console.error("❌ Error fetching docs:", error); 
    } finally {
        setLoadingRecents(false);
    }
  };

  const handleGenerate = async (formData: any) => {
    const toolType = activeModal; 
    setActiveModal(null); 
    
    if (credits !== null && credits <= 0) {
        navigate('/upgrade');
        return;
    }
    
    if (toolType) { 
        setIsGenerating(true); 

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");
            const token = await user.getIdToken();

            const storedSchoolId = localStorage.getItem('schoolId');
            const storedSchoolLogo = localStorage.getItem('schoolLogo'); 

            const currType = getCurriculumType(formData.grade);
            const apiPrefix = currType === 'new' ? '/api/v1/new' : '/api/v1/old';
            
            const headers: any = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "X-User-ID": user.uid
            };
            if (storedSchoolId) headers["X-School-ID"] = storedSchoolId;

            let endpoint = "";
            let payload: any = { 
                uid: user.uid, 
                schoolId: storedSchoolId,
                school: formData.school || schoolName, 
                school_name: formData.school || schoolName,
                schoolLogo: storedSchoolLogo || formData.schoolLogo || null, 
                grade: formData.grade,
                subject: formData.subject,
                term: formData.term
            };

            if (toolType === 'weekly') {
                endpoint = `${API_BASE}${apiPrefix}/generate-weekly-plan`;
                payload = {
                    ...payload,
                    weekNumber: parseInt(String(formData.weekNumber || '1')),
                    days: parseInt(String(formData.days || '5')),
                    startDate: formData.startDate,
                    topic: formData.topic,
                    subtopic: formData.subtopic || "", 
                    references: formData.references || "",
                    objectives: formData.objectives || []
                };
            } 
            else if (toolType === 'lesson') {
                endpoint = `${API_BASE}${apiPrefix}/generate-lesson-plan`;
                payload = {
                    ...payload,
                    teacherName: teacherName, 
                    topic: formData.topic,
                    subtopic: formData.subtopic || formData.lessonTitle || formData.topic,
                    weekNumber: parseInt(String(formData.weekNumber || '1')),
                    boys: parseInt(String(formData.boys || '0')),
                    girls: parseInt(String(formData.girls || '0')),
                    date: formData.startDate || new Date().toISOString().split('T')[0], 
                    timeStart: formData.startTime || "08:00",
                    timeEnd: formData.endTime || "08:40",
                    objectives: formData.objectives || [],
                    bloomsLevel: formData.bloomsLevel || ""
                };
            } 
            // 🚀 SCHEME LOGIC UPDATED TO INCLUDE MULTIPLE SUBTOPICS AND CONSOLE LOGS
            else if (toolType === 'scheme') {
                // 🆕 DEBUGGING LOGS ADDED HERE
                console.log("🚀 --- INITIATING SCHEME GENERATION (useTeacherLogic.ts) ---");
                console.log("📚 Selected Topics Payload:", formData.topics);
                console.log("📑 Selected Subtopics Payload:", formData.subtopics);
                console.log("📦 Full FormData received in handleGenerate:", formData);

                endpoint = `${API_BASE}${apiPrefix}/generate-scheme`;
                const topicsArray = formData.topics || [formData.topic, formData.subtopic].filter(Boolean);

                payload = {
                    ...payload,
                    weeks: parseInt(String(formData.weeks || '13')),
                    startDate: formData.startDate || null,
                    topics: topicsArray.length > 0 ? topicsArray : [], 
                    subtopics: formData.subtopics || [], // 👈 ADDED MULTIPLE SUBTOPICS
                    topic: formData.topic || "Full Term Scheme",
                    subtopic: formData.subtopic || formData.lessonTitle || ""
                };
            } 
            else if (toolType === 'record') {
                endpoint = `${API_BASE}${apiPrefix}/generate-record-of-work`;
                payload = {
                    ...payload,
                    teacherName: teacherName,
                    year: new Date().getFullYear().toString(),
                    weekNumber: parseInt(String(formData.weekNumber || '1')),
                    days: parseInt(String(formData.days || '5')),
                    startDate: formData.startDate,
                    topic: formData.topic,
                    subtopic: formData.subtopic || "",
                    references: formData.references || "",
                    objectives: formData.objectives || []
                };
            }
            // 🚀 EXAM LOGIC UPDATED TO INCLUDE MULTIPLE SUBTOPICS
            else if (toolType === 'exam') {
                endpoint = `${API_BASE}/api/exams/generate`; 
                const topicsArray = formData.topics || [formData.topic, formData.subtopic].filter(Boolean);
                
                const providedBlueprint = formData.blueprint || {};
                const safeBlueprint = {
                    mcq: parseInt(String(providedBlueprint.mcq || 0)),
                    true_false: parseInt(String(providedBlueprint.true_false || 0)),
                    matching: parseInt(String(providedBlueprint.matching || 0)),
                    short_answer: parseInt(String(providedBlueprint.short_answer || providedBlueprint.one_word || 0)),
                    computational: parseInt(String(providedBlueprint.computational || 0)),
                    essay: parseInt(String(providedBlueprint.essay || 0)),
                    case_study: parseInt(String(providedBlueprint.case_study || 0))
                };

                const totalQuestions = Object.values(safeBlueprint).reduce((sum, val) => sum + val, 0);
                if (totalQuestions === 0) {
                    safeBlueprint.mcq = 0;
                    safeBlueprint.short_answer = 0;
                    safeBlueprint.essay = 0;
                }

                payload = {
                    ...payload,
                    topics: topicsArray.length > 0 ? topicsArray : ["General Review"],
                    subtopics: formData.subtopics || [], // 👈 ADDED MULTIPLE SUBTOPICS
                    blueprint: safeBlueprint
                };
            }
            else if (toolType === 'catchup') {
                endpoint = `${API_BASE}/api/v1/catchup/generate-catchup-plan`; 
                payload = {
                    ...payload,
                    teacherName: teacherName,
                    topic: formData.topic,
                    subtopic: formData.subtopic || "",
                    activityName: formData.lessonTitle,
                    catchupLevel: formData.catchupLevel,
                    weekNumber: parseInt(String(formData.weekNumber || '1')),
                    boys: parseInt(String(formData.boys || '0')),
                    girls: parseInt(String(formData.girls || '0')),
                    date: formData.startDate || new Date().toISOString().split('T')[0], 
                    timeStart: formData.startTime || "08:00",
                    timeEnd: formData.endTime || "08:40",
                    objectives: formData.objectives || [],
                    steps: formData.catchupSteps || [],
                    materials: formData.catchupMaterials || []
                };
            }

            const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("❌ RAW BACKEND ERROR:", errData); 

                let errorMessage = "Generation failed. Please try again.";
                
                if (Array.isArray(errData.detail)) {
                    errorMessage = errData.detail.map((err: any) => `'${err.loc[err.loc.length - 1]}': ${err.msg}`).join(' | ');
                } else if (errData.detail) {
                    errorMessage = errData.detail;
                }

                throw new Error(`Validation Error: ${errorMessage}`);
            }
            
            const result = await response.json();
            const metaWithLogo = { ...payload, logoUrl: storedSchoolLogo };

            // Routing Logic after generation
            if (toolType === 'weekly') {
                 navigate(currType === 'new' ? '/weekly-view' : '/old-weekly-view', { state: { planData: result.data, meta: metaWithLogo } });
            } else if (toolType === 'lesson') {
                 navigate(currType === 'new' ? '/lesson-view' : '/old-lesson-plan-view', { state: { lessonData: result.data || result, meta: metaWithLogo } });
            } else if (toolType === 'scheme') {
                 navigate(currType === 'new' ? '/schemes' : '/old-schemes', { state: { schemeData: result.data || result.rows || result, introInfo: result.intro, ...formData } });
            } else if (toolType === 'record') {
                 navigate('/record-view', { state: { recordData: result.data || result, meta: metaWithLogo } });
            } else if (toolType === 'exam') {
                 navigate('/exam-view', { state: { examData: result.data || result, meta: metaWithLogo } });
            } else if (toolType === 'catchup') { 
                 navigate('/catchup-view', { state: { planData: result.data || result, meta: metaWithLogo } });
            }

        } catch (error: any) {
            console.error("Generation Error:", error);
            if (error.message && (error.message.toLowerCase().includes("upgrade") || error.message.toLowerCase().includes("expired"))) {
                navigate('/upgrade');
            } else {
                alert(error.message || "Failed to generate. Please try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    }
  };

  // ADD THIS FUNCTION inside useTeacherDashboard hook
  const submitEvaluation = async (lessonId: string, meta: any, status: 'success' | 'failed', customFeedback?: string) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();
        
        const currType = getCurriculumType(meta.grade);
        const apiPrefix = currType === 'new' ? '/api/v1/new' : '/api/v1/old';
        
        // Map UI clicks to backend triggers
        const feedbackString = customFeedback || (status === 'success' ? '5_stars_success' : '1_star_needs_help');

        const response = await fetch(`${API_BASE}${apiPrefix}/evaluate-lesson`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "X-User-ID": user.uid,
                "X-School-ID": localStorage.getItem('schoolId') || ""
            },
            body: JSON.stringify({
                uid: user.uid,
                lesson_id: lessonId,
                grade: meta.grade,
                subject: meta.subject,
                topic: meta.topic || meta.main_topic || "General Topic",
                subtopic: meta.subtopic || meta.sub_topic || "",
                feedback: feedbackString,
                schoolId: localStorage.getItem('schoolId') || null
            })
        });

        if (!response.ok) throw new Error("Evaluation failed to submit");
        return await response.json();
    } catch (error) {
        console.error("Error submitting evaluation:", error);
        throw error;
    }
  };
  const handleOpenRecent = (docData: any) => {
    if (docData.custom_html || (docData.data && docData.data.html) || docData.html_content) {
        navigate('/smart-view', {
            state: {
                data: { type: 'custom_html', html: docData.custom_html || docData.html_content || docData.data.html, school_name: schoolName },
                meta: { ...docData, school: schoolName }
            }
        });
        return;
    }

    const finalSchoolName = docData.schoolName || docData.school || schoolName;
    const finalLogo = docData.logoUrl || docData.logo || localStorage.getItem('schoolLogo');

    const metaData = { 
        ...docData, 
        school: finalSchoolName, 
        logoUrl: finalLogo, 
        docId: docData.id 
    };

    if (docData.type === 'record') {
        navigate('/record-view', { state: { recordData: docData.data || docData.recordData, meta: metaData, isLocked: docData.isLocked, customColumns: docData.customColumns } });
    } else if (docData.type === 'scheme') {
        const currType = getCurriculumType(docData.grade || "");
        let rows = docData.schemeData?.rows || docData.schemeData || docData.rows || [];
        navigate(currType === 'new' ? '/schemes' : '/old-schemes', { state: { ...docData, schemeData: rows, schoolName: finalSchoolName, isViewMode: true, meta: metaData, isLocked: docData.isLocked, customColumns: docData.customColumns } });
    } else if (docData.type === 'weekly') {
        const currType = getCurriculumType(docData.grade || "");
        navigate(currType === 'new' ? '/weekly-view' : '/old-weekly-view', { state: { planData: docData.planData || docData.weeklyData, meta: metaData, isLocked: docData.isLocked, customColumns: docData.customColumns } });
    } else if (docData.type === 'lesson') {
        const currType = getCurriculumType(docData.grade || "");
        navigate(currType === 'new' ? '/lesson-view' : '/old-lesson-plan-view', { state: { lessonData: docData.planData || docData.lessonData, meta: metaData, isLocked: docData.isLocked, customColumns: docData.customColumns } });
    } else if (docData.type === 'exam') {
        navigate('/exam-view', { state: { examData: docData.examData || docData.data, meta: metaData } });
    } else if (docData.type === 'catchup') { 
        navigate('/catchup-view', { state: { planData: docData.planData || docData.catchupData || docData.data, meta: metaData, isLocked: docData.isLocked, customColumns: docData.customColumns } });
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('schoolId');
    localStorage.removeItem('teacherDocId');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('schoolLogo'); 
    await signOut(auth);
    navigate('/login');
  };

  return {
    teacherName, schoolName, loading, credits, expiresAt,
    recentDocs, loadingRecents, isGenerating,
    activeModal, setActiveModal,
    activeFilter, setActiveFilter,
    hasSchoolId, 
    handleGenerate,
    handleOpenRecent,
    handleLogout,
    navigate,submitEvaluation
  };
};