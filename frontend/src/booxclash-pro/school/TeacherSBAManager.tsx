import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  PlusCircle,
  Users,
  Sparkles,
  Loader2,
  CheckCircle,
  FileText,
  X,
  Play,
  AlertCircle,
  Target,
  ListChecks,
  Calendar,
  Check,
  Send,
  Printer,
  LineChart 
} from 'lucide-react';

import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  doc,
  updateDoc
} from 'firebase/firestore';

// 🆕 IMPORT FROM SCHEMA
import { ClassData, SBATaskData, StudentData } from './schema'; 
import { useLocation, useNavigate } from 'react-router-dom'; 

interface TeacherSBAManagerProps {
  teacherId?: string | null;
  schoolId?: string | null; 
}

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-76nr.onrender.com');

export default function TeacherSBAManager({ teacherId, schoolId }: TeacherSBAManagerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Merge props with navigation state
  teacherId = teacherId ?? location.state?.teacherId ?? null;
  schoolId = schoolId ?? location.state?.schoolId ?? null;

  // --- STATES ---
  const [joinedClasses, setJoinedClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Student & Assignment States
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedRecords, setAssignedRecords] = useState<any[]>([]);

  // Join Modal States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // 🆕 Syllabus API States
  const [syllabusData, setSyllabusData] = useState<any[]>([]);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);

  // SBA Generation States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('Project');
  const [term, setTerm] = useState('Term 1'); 
  const [maxScore, setMaxScore] = useState<number>(20);
  const [selectedSyllabusContext, setSelectedSyllabusContext] = useState<any>(null); 

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSBA, setGeneratedSBA] = useState<any | null>(null);

  // --- 1. FETCH JOINED CLASSES ---
  useEffect(() => {
    if (!teacherId || !schoolId) {
      setIsLoadingClasses(false);
      return;
    }

    const q = query(collection(db, `schools/${schoolId}/teacher_classes`), where("teacherId", "==", teacherId));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const classIds = snapshot.docs.map(doc => doc.data().classId);
      if (classIds.length === 0) {
        setJoinedClasses([]);
        setIsLoadingClasses(false);
        return;
      }
      try {
        const chunks = [];
        for (let i = 0; i < classIds.length; i += 10) chunks.push(classIds.slice(i, i + 10));

        const classesPromises = chunks.map(chunk => {
          const classesQuery = query(collection(db, `schools/${schoolId}/classes`), where("__name__", "in", chunk));
          return getDocs(classesQuery);
        });

        const classesSnapshots = await Promise.all(classesPromises);
        const classesData = classesSnapshots.flatMap(snap => 
          snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ) as ClassData[];

        setJoinedClasses(classesData);
        if (classesData.length > 0 && !selectedClass) {
          setSelectedClass(classesData[0]);
        }
      } catch (error) {
        console.error("Error fetching class details:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    });
    return () => unsubscribe();
  }, [teacherId, schoolId]);

  // --- 2. FETCH STUDENTS ---
  useEffect(() => {
    if (!selectedClass || !schoolId) {
      setClassStudents([]);
      setAssignedRecords([]);
      return;
    }
    const fetchStudents = async () => {
      const q = query(collection(db, `schools/${schoolId}/students`), where("classId", "==", selectedClass.id));
      const snap = await getDocs(q);
      const students = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentData));
      students.sort((a, b) => a.name.localeCompare(b.name));
      setClassStudents(students);
    };
    fetchStudents();
  }, [selectedClass, schoolId]);

  // --- 3. 🆕 FETCH SYLLABUS FROM NEW API ROUTE ---
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setSyllabusData([]);
      return;
    }

    const fetchSyllabus = async () => {
      setIsLoadingSyllabus(true);
      setTaskTitle('');
      setSelectedSyllabusContext(null);
      
      try {
        // Hit the new backend endpoint
        const response = await fetch(`${API_BASE}/api/sba/syllabus/${encodeURIComponent(selectedSubject)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract the numeric grade from the selected class (e.g. "Grade 10" -> 10)
          const gradeMatch = selectedClass.grade.match(/\d+/);
          const gradeNum = gradeMatch ? parseInt(gradeMatch[0]) : null;

          if (gradeNum && data.grades) {
            // Find the specific grade object in the JSON
            const gradeData = data.grades.find((g: any) => g.grade === gradeNum);
            setSyllabusData(gradeData ? gradeData.topics : []);
          } else {
            setSyllabusData([]);
          }
        } else {
          setSyllabusData([]);
        }
      } catch (error) {
        console.error("Failed to fetch syllabus:", error);
        setSyllabusData([]);
      } finally {
        setIsLoadingSyllabus(false);
      }
    };

    fetchSyllabus();
  }, [selectedClass, selectedSubject]);

  // --- 4. JOIN CLASS ---
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !schoolId) return;
    setIsJoining(true);
    try {
      const cleanCode = joinCode.trim().toUpperCase();
      const q = query(collection(db, `schools/${schoolId}/classes`), where("code", "==", cleanCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return alert("Invalid code.");
      const classId = querySnapshot.docs[0].id;

      if (joinedClasses.some(c => c.id === classId)) return alert("Already joined.");

      await addDoc(collection(db, `schools/${schoolId}/teacher_classes`), {
        teacherId: teacherId, classId: classId, schoolId: schoolId, joinedAt: serverTimestamp()
      });

      alert(`Successfully joined!`);
      setIsJoinModalOpen(false);
      setJoinCode('');
      setSelectedClass({ id: classId, ...querySnapshot.docs[0].data() } as ClassData); 
      setSelectedSubject('');
      setGeneratedSBA(null);
      setAssignedRecords([]);
    } catch (error) {
      alert("Failed to join.");
    } finally {
      setIsJoining(false);
    }
  };

  // --- 5. GENERATE SBA ---
  const handleGenerateSBA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedClass.id || !selectedSubject || !taskTitle || !schoolId) return;

    setIsGenerating(true);
    setGeneratedSBA(null);
    setAssignedRecords([]); 

    try {
      const response = await fetch(`${API_BASE}/api/sba/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: "Zambia", 
          grade: selectedClass.grade.replace('_', ' '),
          subject: selectedSubject, 
          term: term, 
          task_title: taskTitle,
          task_type: taskType, 
          max_score: maxScore, 
          specific_topic: selectedSyllabusContext?.target || null 
        })
      });

      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      
      const newTask: Omit<SBATaskData, 'id'> = {
        classId: selectedClass.id!, teacherId: teacherId || "unknown", 
        schoolId: schoolId, subject: selectedSubject, title: taskTitle,
        type: taskType, maxScore: maxScore, content: data, createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, `schools/${schoolId}/sba_tasks`), newTask);
      setGeneratedSBA({ ...data, id: docRef.id });
    } catch (error) {
      alert("Failed to generate.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 6. ASSIGN TO STUDENTS ---
  const handleAssignToStudents = async () => {
    if (!generatedSBA || !generatedSBA.id || !selectedClass || !schoolId) return;
    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const newRecords: any[] = [];
      classStudents.forEach(student => {
        const recordRef = doc(collection(db, `schools/${schoolId}/student_sba_records`));
        const recordData = {
          studentId: student.id, studentName: student.name, taskId: generatedSBA.id,
          taskTitle: generatedSBA.title || taskTitle, classId: selectedClass.id,
          teacherId: teacherId, maxScore: maxScore, obtainedScore: null, assignedAt: serverTimestamp()
        };
        batch.set(recordRef, recordData);
        newRecords.push({ ...recordData, id: recordRef.id, tempScore: '' });
      });
      await batch.commit();
      setAssignedRecords(newRecords);
    } catch (error) {
      alert("Failed to assign.");
    } finally {
      setIsAssigning(false);
    }
  };

  // --- 7. SAVE SCORE ---
  const handleSaveScore = async (recordId: string, score: number) => {
    if (!schoolId) return;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/student_sba_records`, recordId), { obtainedScore: score });
      setAssignedRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, obtainedScore: score } : rec));
    } catch (error) {
      alert("Failed to save score.");
    }
  };

  // --- 8. 🖨️ EXPORT TO PDF (RESTORED FUNCTION) ---
  const handlePrintPDF = () => {
    window.print();
  };

  // --- RENDER COMPONENT ---
  if (isLoadingClasses) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>;
  if (!schoolId) return <div className="max-w-3xl mx-auto p-12 text-center animate-in fade-in"><div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 flex flex-col items-center"><AlertCircle className="text-rose-500 w-16 h-16 mb-4" /><h2 className="text-2xl font-black text-slate-800 mb-2">School Required</h2></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto p-6 relative bg-slate-50 min-h-screen print:bg-white print:p-0">
      
      {/* HEADER (Hidden during print) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen size={32} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Teacher SBA Workspace</h1>
            <p className="text-slate-500">Join classes, generate rubrics, and grade students.</p>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3">
          {joinedClasses.length > 0 && (
            <button 
              onClick={() => navigate('/student-reports', { state: { schoolId, teacherId } })} 
              className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <LineChart size={20}/> View Student Reports
            </button>
          )}
          <button 
            onClick={() => setIsJoinModalOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
          >
            <PlusCircle size={20} /> Join Class
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6 print:block">
        
        {/* LEFT SIDEBAR (Hidden during print) */}
        <div className="md:col-span-4 space-y-4 print:hidden">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">My Classes</h3>
          {joinedClasses.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-500 font-medium mb-4">You haven't joined any classes yet.</p>
              <button onClick={() => setIsJoinModalOpen(true)} className="text-indigo-600 font-bold hover:underline">Enter a Join Code</button>
            </div>
          ) : (
            joinedClasses.map(cls => (
              <div key={cls.id} onClick={() => { setSelectedClass(cls); setSelectedSubject(''); setGeneratedSBA(null); setAssignedRecords([]); }} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedClass?.id === cls.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-black ${selectedClass?.id === cls.id ? 'text-indigo-900' : 'text-slate-800'}`}>{cls.name}</h4>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">{cls.grade}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Users size={14}/> {cls.studentCount} Students
                </div>
              </div>
            ))
          )}

          {selectedClass && (
            <div className="mt-6 animate-in slide-in-from-top-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText size={16}/> Select Subject</h3>
              <div className="flex flex-col gap-2">
                {selectedClass.subjects.length > 0 ? (
                  selectedClass.subjects.map(sub => (
                    <button key={sub} onClick={() => { setSelectedSubject(sub); setGeneratedSBA(null); setAssignedRecords([]); }} className={`text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${selectedSubject === sub ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{sub}</button>
                  ))
                ) : <p className="text-xs text-rose-500 italic">No subjects configured.</p>}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT CONTENT: GENERATOR & GRADING */}
        <div className="md:col-span-8 print:w-full">
          {selectedClass && selectedSubject ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in print:border-none print:shadow-none print:p-0">
              
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 print:hidden">
                <Sparkles className="text-indigo-500" size={24}/>
                <h2 className="text-xl font-black text-slate-800">Assessment: {selectedSubject}</h2>
              </div>

              {/* GENERATOR FORMS (Hidden during print) */}
              {!generatedSBA && (
                <div className="print:hidden">
                  
                  {/* 🆕 NEW SYLLABUS RENDERER */}
                  <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Target size={16}/> Step 1: Select Syllabus Target
                    </h3>

                    {isLoadingSyllabus ? (
                      <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-500 w-6 h-6"/></div>
                    ) : syllabusData.length > 0 ? (
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {syllabusData.map((topicBlock, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                               <BookOpen size={16} className="text-indigo-500"/> {topicBlock.topic}
                            </h4>
                            
                            {/* Subtopics */}
                            {topicBlock.subtopics && topicBlock.subtopics.length > 0 && (
                              <div className="mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">Subtopics</span>
                                <div className="flex flex-wrap gap-2">
                                  {topicBlock.subtopics.map((sub: string, subIdx: number) => {
                                    const isSelected = selectedSyllabusContext?.target === sub;
                                    return (
                                      <button 
                                        key={subIdx} type="button" 
                                        onClick={() => { setTaskTitle(sub); setSelectedSyllabusContext({ type: 'subtopic', target: sub, topic: topicBlock.topic }); }} 
                                        className={`border px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                      >
                                        {isSelected && <Check size={12}/>} {sub}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Practical & Experimental Content */}
                            {topicBlock.practical_and_experimental_content && topicBlock.practical_and_experimental_content.length > 0 && (
                              <div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                                  <Target size={12}/> Practical & Experimental
                                </span>
                                <div className="flex flex-col gap-2">
                                  {topicBlock.practical_and_experimental_content.map((prac: string, pIdx: number) => {
                                    const isSelected = selectedSyllabusContext?.target === prac;
                                    return (
                                      <button 
                                        key={pIdx} type="button" 
                                        onClick={() => { setTaskTitle("Practical: " + topicBlock.topic); setSelectedSyllabusContext({ type: 'practical', target: prac, topic: topicBlock.topic }); }} 
                                        className={`border px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-start gap-2 ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow ring-2 ring-emerald-200' : 'bg-emerald-50/50 text-emerald-800 border-emerald-100 hover:border-emerald-300'}`}
                                      >
                                        {isSelected ? <Check size={14} className="shrink-0 mt-0.5"/> : <ListChecks size={14} className="text-emerald-400 shrink-0 mt-0.5"/>} 
                                        <span>{prac}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic text-center py-6">No specific syllabus data found for {selectedSubject} in {selectedClass.grade}. You can still create an assessment manually below.</p>
                    )}
                  </div>

                  <form onSubmit={handleGenerateSBA} className="space-y-6 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Play size={16}/> Step 2: Finalize Details</h3>
                    {selectedSyllabusContext && (
                      <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs font-bold flex items-center gap-2 border border-emerald-100">
                        <CheckCircle size={16}/> Selected Target: {selectedSyllabusContext.target}
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assessment Title / Topic</label>
                        <input type="text" required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Select an outcome above or type manually..." className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white font-bold text-slate-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Calendar size={14}/> Term</label>
                        <select value={term} onChange={e => setTerm(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white">
                          <option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Task Type</label>
                        <select value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white">
                          <option value="Project">Project</option><option value="Practical">Practical / Experiment</option><option value="Field Work">Field Work</option><option value="Written Assignment">Written Assignment</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Marks</label>
                        <input type="number" required min="5" max="100" value={maxScore} onChange={e => setMaxScore(parseInt(e.target.value))} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white" />
                      </div>
                    </div>
                    <button type="submit" disabled={isGenerating || !taskTitle} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-slate-400">
                      {isGenerating ? <><Loader2 className="animate-spin" size={20}/> Generating Rubric...</> : <><Sparkles size={20}/> Generate Assessment</>}
                    </button>
                  </form>
                </div>
              )}

              {/* ==============================================
                  GENERATED CONTENT & STUDENT GRADING VIEW 
                  ============================================== */}
              {generatedSBA && (
                <div className="animate-in slide-in-from-bottom-4 space-y-6 print:space-y-4">
                  
                  {/* PRINT HEADER (Only visible when printing) */}
                  <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-black uppercase mb-2">School Based Assessment (SBA)</h1>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Class: {selectedClass.name} ({selectedClass.grade})</span>
                      <span>Subject: {selectedSubject}</span>
                      <span>{term}</span>
                    </div>
                  </div>

                  {/* Rubric View */}
                  <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-sm print:bg-transparent print:border-black print:p-0 print:shadow-none">
                    <div className="flex justify-between items-center mb-6 print:mb-2">
                      <h4 className="font-black text-indigo-900 uppercase tracking-wider print:text-black">
                        {generatedSBA.title || taskTitle} - Evaluation Rubric
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold text-sm print:border print:border-black print:bg-transparent print:text-black">Total: {maxScore} Marks</span>
                        
                        <button onClick={handlePrintPDF} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2 rounded-lg shadow-sm print:hidden" title="Save as PDF">
                          <Printer size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 print:border-none print:p-0">
                      <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs tracking-wider print:text-black">Learner Instructions</h4>
                      <p className="text-slate-600 text-sm whitespace-pre-wrap print:text-black">{generatedSBA.learner_instructions}</p>
                    </div>

                    <div className="space-y-2 mb-6">
                      {generatedSBA.rubric?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-indigo-50 print:border-b print:border-slate-300 print:shadow-none print:rounded-none">
                          <span className="text-sm font-medium text-slate-700 print:text-black">{item.criteria}</span>
                          <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded print:bg-transparent print:text-black print:border print:border-black">{item.marks} pts</span>
                        </div>
                      ))}
                    </div>

                    {/* ASSIGN TO STUDENTS BUTTON */}
                    {assignedRecords.length === 0 && (
                      <button 
                        onClick={handleAssignToStudents}
                        disabled={isAssigning}
                        className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-md print:hidden"
                      >
                        {isAssigning ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                        Assign to all {classStudents.length} Students in {selectedClass.name}
                      </button>
                    )}
                  </div>

                  {/* 📊 CLEAN GRADING TABLE */}
                  {assignedRecords.length > 0 && (
                    <div className="pt-6 border-t border-slate-200 print:mt-12">
                      <div className="flex justify-between items-center mb-6 print:hidden">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Users className="text-emerald-500" size={20}/> Student Grading
                          </h3>
                          <span className="text-sm font-bold text-slate-500">
                            {assignedRecords.filter(r => r.obtainedScore !== null).length} / {assignedRecords.length} Graded
                          </span>
                        </div>
                      </div>

                      {/* Print-Only Roster Title */}
                      <h3 className="hidden print:block text-xl font-black mb-4 uppercase">Grading Roster</h3>
                      
                      <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-none">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 print:bg-transparent print:border-black">
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase print:text-black">Student Name</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase print:text-black">ID</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase print:text-black">Status</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right print:text-black">Score (/{maxScore})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignedRecords.map((record) => {
                              const isGraded = record.obtainedScore !== null;
                              return (
                                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors print:border-slate-300">
                                  <td className="p-4 font-bold text-slate-800 print:text-black">{record.studentName}</td>
                                  <td className="p-4 font-mono text-xs text-slate-400 print:text-black">{record.studentId}</td>
                                  <td className="p-4 print:hidden">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded
                                      ${isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
                                    `}>
                                      {isGraded ? 'Graded' : 'Pending'}
                                    </span>
                                  </td>
                                  
                                  {/* Print-Only Status Column */}
                                  <td className="hidden print:table-cell p-4 font-bold">
                                     {isGraded ? 'Completed' : '_____'}
                                  </td>

                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 print:hidden">
                                      <input 
                                        type="number" min="0" max={maxScore} placeholder="-"
                                        value={record.tempScore !== undefined ? record.tempScore : (record.obtainedScore ?? '')}
                                        onChange={(e) => setAssignedRecords(prev => prev.map(r => r.id === record.id ? {...r, tempScore: e.target.value} : r))}
                                        className="w-16 p-2 border border-slate-300 rounded text-center font-bold"
                                      />
                                      <button
                                        onClick={() => handleSaveScore(record.id, Number(record.tempScore))}
                                        disabled={record.tempScore === '' || record.tempScore === undefined}
                                        className="bg-indigo-600 text-white px-3 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300"
                                      >
                                        Save
                                      </button>
                                    </div>
                                    
                                    {/* Print-Only Score Display */}
                                    <div className="hidden print:block font-bold">
                                      {isGraded ? `${record.obtainedScore} / ${maxScore}` : `_____ / ${maxScore}`}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-12 text-center bg-slate-50 print:hidden">
              <BookOpen className="text-slate-300 w-16 h-16 mb-4" />
              <h3 className="text-lg font-bold text-slate-500">No Subject Selected</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-sm">Select a class and a subject from the sidebar to start generating AI-powered assessments.</p>
            </div>
          )}
        </div>
      </div>

      {/* JOIN CLASS MODAL */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">Join a Class</h3>
              <button onClick={() => setIsJoinModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleJoinClass} className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-4">Ask your school administrator for the 6-character class code to get access to your students.</p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class Code</label>
                <input 
                  type="text" required maxLength={6}
                  value={joinCode} onChange={e => setJoinCode(e.target.value)}
                  placeholder="e.g. AB12CD"
                  className="w-full p-4 text-center text-2xl tracking-widest font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 uppercase"
                />
              </div>
              <button 
                type="submit" disabled={isJoining || joinCode.length < 5}
                className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:bg-slate-300"
              >
                {isJoining ? "Verifying..." : "Join Class"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
