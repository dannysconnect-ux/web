import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Award,
  Loader2,
  Printer,
  ChevronRight,
  UserCircle,
  FileText,
  AlertCircle
} from 'lucide-react';

import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

// --- TYPES ---
interface ClassData {
  id: string;
  name: string;
  grade: string;
}

interface StudentData {
  id: string;
  name: string;
  classId: string;
}

interface SBATask {
  id: string;
  title: string;
  subject: string;
  term: string;
  type: string;
  maxScore: number;
}

interface StudentRecord {
  id: string;
  taskId: string;
  obtainedScore: number | null;
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : 'https://booxclash-pro.onrender.com');

export default function StudentPerformanceDashboard(props: any) {
  const location = useLocation();
  const schoolId = props.schoolId || location.state?.schoolId || localStorage.getItem('schoolId');
  const teacherId = props.teacherId || location.state?.teacherId || localStorage.getItem('teacherDocId');

  // States
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  
  const [classTasks, setClassTasks] = useState<Record<string, SBATask>>({});
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [sbaConfigs, setSbaConfigs] = useState<{ primary: any, secondary: any }>({ primary: null, secondary: null });
  
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // 1. FETCH CONFIGS
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [primaryRes, secondaryRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/sba/config/primary`).catch(() => null),
          fetch(`${API_BASE_URL}/api/sba/config/secondary`).catch(() => null)
        ]);
        let primary = null, secondary = null;
        if (primaryRes && primaryRes.ok) primary = await primaryRes.json();
        if (secondaryRes && secondaryRes.ok) secondary = await secondaryRes.json();
        setSbaConfigs({ primary, secondary });
      } catch (err) { console.error(err); }
    };
    loadConfigs();
  }, []);

  // 2. FETCH TEACHER'S CLASSES
  useEffect(() => {
    if (!schoolId || !teacherId) return setLoading(false);
    const fetchClasses = async () => {
      try {
        const tClassQ = query(collection(db, `schools/${schoolId}/teacher_classes`), where("teacherId", "==", teacherId));
        const tClassSnap = await getDocs(tClassQ);
        const classIds = tClassSnap.docs.map(d => d.data().classId);

        if (classIds.length === 0) return setLoading(false);

        let allClasses: ClassData[] = [];
        for (let i = 0; i < classIds.length; i += 10) {
          const chunk = classIds.slice(i, i + 10);
          const cQ = query(collection(db, `schools/${schoolId}/classes`), where("__name__", "in", chunk));
          const cSnap = await getDocs(cQ);
          allClasses = [...allClasses, ...cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData))];
        }
        setClasses(allClasses);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [schoolId, teacherId]);

  // 3. FETCH STUDENTS & TASKS FOR SELECTED CLASS
  useEffect(() => {
    if (!selectedClass || !schoolId) return;

    const fetchClassData = async () => {
      const sq = query(collection(db, `schools/${schoolId}/students`), where("classId", "==", selectedClass.id));
      const sSnap = await getDocs(sq);
      const studentList = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentData));
      studentList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentList);

      const tq = query(collection(db, `schools/${schoolId}/sba_tasks`), where("classId", "==", selectedClass.id));
      const tSnap = await getDocs(tq);
      const tasksMap: Record<string, SBATask> = {};
      tSnap.docs.forEach(doc => {
        const data = doc.data();
        tasksMap[doc.id] = { id: doc.id, title: data.title, subject: data.subject, term: data.term || 'Term 1', type: data.type, maxScore: data.maxScore };
      });
      setClassTasks(tasksMap);
    };

    fetchClassData();
    setSelectedStudent(null);
  }, [selectedClass, schoolId]);

  // 4. FETCH RECORDS FOR SELECTED STUDENT
  useEffect(() => {
    if (!selectedStudent || !schoolId) return;
    setLoadingRecords(true);

    const rq = query(collection(db, `schools/${schoolId}/student_sba_records`), where("studentId", "==", selectedStudent.id));
    const unsubscribe = onSnapshot(rq, (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, taskId: d.data().taskId, obtainedScore: d.data().obtainedScore }));
      setStudentRecords(records);
      setLoadingRecords(false);
    });

    return () => unsubscribe();
  }, [selectedStudent, schoolId]);

  // --- ECZ CALCULATION ENGINE ---
  const calculateECZScore = (subject: string, grade: string, obtained: number, max: number) => {
    if (max === 0) return { score: 0, weight: 100, label: 'N/A' };
    
    // Default to 100% if we can't find rules
    let weight = 100;
    let label = "Total %";

    const isPrimary = ["Grade 5", "Grade 6", "Grade 7"].includes(grade);
    const cleanSub = subject.replace(/ /g, '_');

    if (isPrimary) {
      // Primary is consistently 10% per year according to global rules
      weight = 10;
      label = "ECZ Weight (/10)";
    } else {
      // Attempt to parse Secondary Weights from JSON
      const subData = sbaConfigs.secondary?.Secondary_SBA_Comprehensive_Guidelines?.Subjects?.[cleanSub];
      if (subData?.Grading_Rules?.Calculation) {
        const calcStr = subData.Grading_Rules.Calculation as string;
        const match = calcStr.match(/\*\s*(\d+)/); // Extracts * 30, * 15, etc.
        if (match) {
          weight = parseInt(match[1]);
          label = `ECZ Weight (/${weight})`;
        } else if (calcStr.includes("/ 5")) {
          weight = 12; // Geography specific rule
          label = `ECZ Weight (/12)`;
        }
      }
    }

    // Apply ECZ Rounding Rule: nearest whole number
    const score = Math.round((obtained / max) * weight);
    return { score, weight, label };
  };

  // --- DATA GROUPING (Subject -> Term -> Tasks) ---
  const generateReportData = () => {
    const report: Record<string, Record<string, any[]>> = {};

    studentRecords.forEach(record => {
      const task = classTasks[record.taskId];
      if (task) {
        if (!report[task.subject]) report[task.subject] = {};
        if (!report[task.subject][task.term]) report[task.subject][task.term] = [];

        report[task.subject][task.term].push({
          title: task.title,
          type: task.type,
          obtained: record.obtainedScore,
          max: task.maxScore
        });
      }
    });

    return report;
  };

  const reportData = selectedStudent ? generateReportData() : null;

  // --- RENDERING ---
  if (!schoolId) return <div className="p-12 text-center text-slate-500">Missing School Credentials.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 print:p-0 print:bg-white flex flex-col md:flex-row gap-6">
      
      {/* 👈 LEFT SIDEBAR (Hidden on Print) */}
      <div className="w-full md:w-80 flex-shrink-0 space-y-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4"><Users className="text-indigo-500"/> Roster Selector</h2>
          
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Select Class</label>
          <select 
            className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 mb-4 font-bold"
            onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
            defaultValue=""
          >
            <option value="" disabled>-- Choose a Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
          </select>

          {selectedClass && (
            <>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Select Student</label>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {students.map(student => (
                  <button
                    key={student.id} onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${selectedStudent?.id === student.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 border border-slate-200'}`}
                  >
                    <span className="truncate">{student.name}</span>
                    <ChevronRight size={16} className={selectedStudent?.id === student.id ? 'text-indigo-200' : 'text-slate-400'}/>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 👉 RIGHT AREA (The Report Card) */}
      <div className="flex-1">
        {!selectedStudent ? (
          <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white print:hidden">
            <FileText className="w-16 h-16 mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-600">Student Performance Report</h3>
            <p className="mt-2 max-w-md">Select a class and a student to view their ECZ-formatted SBA report card.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none p-8 print:p-0 animate-in fade-in">
            
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100 print:hidden">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Award className="text-emerald-500"/> ECZ Performance Record</h2>
              <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md">
                <Printer size={18}/> Print Official Report
              </button>
            </div>

            {/* --- PRINTABLE REPORT CARD START --- */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-black uppercase text-slate-900 print:text-black">Examinations Council of Zambia</h1>
              <h2 className="text-lg md:text-xl font-bold text-slate-600 mt-1 uppercase print:text-black">School Based Assessment (SBA) Report</h2>
              <div className="w-24 h-1 bg-indigo-500 mx-auto mt-4 print:bg-black"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 border-2 border-black rounded-lg mb-8 bg-slate-50 print:bg-transparent">
              <div><span className="font-bold uppercase text-xs text-slate-500 print:text-black">Candidate Name:</span> <p className="font-black text-lg">{selectedStudent.name}</p></div>
              <div><span className="font-bold uppercase text-xs text-slate-500 print:text-black">Candidate ID:</span> <p className="font-black text-lg font-mono">{selectedStudent.id}</p></div>
              <div><span className="font-bold uppercase text-xs text-slate-500 print:text-black">Grade / Level:</span> <p className="font-bold">{selectedClass?.grade}</p></div>
              <div><span className="font-bold uppercase text-xs text-slate-500 print:text-black">Class / Form:</span> <p className="font-bold">{selectedClass?.name}</p></div>
            </div>

            {loadingRecords ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>
            ) : (
              <div className="space-y-10">
                {Object.keys(reportData!).map(subject => {
                  const termData = reportData![subject];
                  let subjectTotalObtained = 0;
                  let subjectTotalMax = 0;

                  return (
                    <div key={subject} className="break-inside-avoid border border-slate-300 print:border-black rounded-xl overflow-hidden">
                      {/* Subject Header */}
                      <div className="bg-slate-900 text-white px-4 py-3 print:bg-slate-200 print:text-black print:border-b print:border-black">
                        <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                          <BookOpen size={18}/> {subject}
                        </h3>
                      </div>
                      
                      <div className="p-4">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-300 print:border-black">
                              <th className="py-2 font-bold uppercase text-xs print:text-black">Term</th>
                              <th className="py-2 font-bold uppercase text-xs print:text-black">Task / Outcome</th>
                              <th className="py-2 font-bold uppercase text-xs text-center print:text-black">Max Marks</th>
                              <th className="py-2 font-bold uppercase text-xs text-center print:text-black">Obtained</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(termData).sort().map(term => (
                              termData[term].map((task, idx) => {
                                const isGraded = task.obtained !== null;
                                if (isGraded) {
                                  subjectTotalObtained += task.obtained;
                                  subjectTotalMax += task.max;
                                }

                                return (
                                  <tr key={`${term}-${idx}`} className="border-b border-slate-100 print:border-slate-300">
                                    <td className="py-3 font-bold text-slate-500 print:text-black">{idx === 0 ? term : ''}</td>
                                    <td className="py-3 font-medium text-slate-800 print:text-black">{task.title} <span className="block text-[10px] text-slate-400 uppercase">{task.type}</span></td>
                                    <td className="py-3 text-center font-bold text-slate-600 print:text-black">{task.max}</td>
                                    <td className="py-3 text-center font-black print:text-black">
                                      {isGraded ? task.obtained : <span className="text-amber-500 text-xs italic">Ungraded</span>}
                                    </td>
                                  </tr>
                                );
                              })
                            ))}
                          </tbody>
                        </table>

                        {/* Subject ECZ Calculation Footer */}
                        {subjectTotalMax > 0 && (
                          <div className="mt-4 border-t-2 border-black pt-3 flex justify-end">
                            {(() => {
                              const ecz = calculateECZScore(subject, selectedClass!.grade, subjectTotalObtained, subjectTotalMax);
                              return (
                                <div className="grid grid-cols-2 gap-x-8 text-right">
                                  <span className="font-bold text-slate-600 uppercase text-xs print:text-black">Total Raw Marks:</span>
                                  <span className="font-black">{subjectTotalObtained} / {subjectTotalMax}</span>
                                  
                                  <span className="font-black text-indigo-900 uppercase text-sm mt-1 print:text-black">{ecz.label}:</span>
                                  <span className="font-black text-xl text-indigo-600 mt-1 print:text-black">{ecz.score}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {Object.keys(reportData!).length === 0 && (
                  <p className="text-center py-10 text-slate-500 italic border border-dashed rounded-xl">No assessments recorded for this student yet.</p>
                )}
              </div>
            )}
            
            {/* Signature Area for Printing */}
            <div className="hidden print:flex justify-between mt-24 pt-8 px-12">
              <div className="text-center">
                <div className="w-56 border-b border-black mb-2 h-8"></div>
                <p className="font-bold text-xs uppercase tracking-wider">Class Teacher Signature</p>
              </div>
              <div className="text-center">
                <div className="w-56 border-b border-black mb-2 h-8"></div>
                <p className="font-bold text-xs uppercase tracking-wider">Date</p>
              </div>
              <div className="text-center">
                <div className="w-56 border-b border-black mb-2 h-8"></div>
                <p className="font-bold text-xs uppercase tracking-wider">Head Teacher Signature</p>
              </div>
            </div>
            {/* --- END PRINTABLE AREA --- */}

          </div>
        )}
      </div>
    </div>
  );
}