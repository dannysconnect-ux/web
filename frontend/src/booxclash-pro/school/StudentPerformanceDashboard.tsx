import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Loader2,
  Printer,
  ChevronRight,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface TaskRow {
  title: string;
  type: string;
  term1: number | null;
  term2: number | null;
  term3: number | null;
  marksPerTask: number;
  totalObtained: number;
  totalMax: number;
}

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-76nr.onrender.com');

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
  
  const [, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // 1. FETCH CONFIGS
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [primaryRes, secondaryRes] = await Promise.all([
          fetch(`${API_BASE}/api/sba/config/primary`).catch(() => null),
          fetch(`${API_BASE}/api/sba/config/secondary`).catch(() => null)
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
    
    let weight = 100;
    let label = "Total %";

    const isPrimary = ["Grade 5", "Grade 6", "Grade 7"].includes(grade);
    const cleanSub = subject.replace(/ /g, '_');

    if (isPrimary) {
      weight = 10;
      label = "ECZ Weight (/10)";
    } else {
      const subData = sbaConfigs.secondary?.Secondary_SBA_Comprehensive_Guidelines?.Subjects?.[cleanSub];
      if (subData?.Grading_Rules?.Calculation) {
        const calcStr = subData.Grading_Rules.Calculation as string;
        const match = calcStr.match(/\*\s*(\d+)/); 
        if (match) {
          weight = parseInt(match[1]);
          label = `ECZ Weight (/${weight})`;
        } else if (calcStr.includes("/ 5")) {
          weight = 12;
          label = `ECZ Weight (/12)`;
        }
      }
    }

    const score = Math.round((obtained / max) * weight);
    return { score, weight, label };
  };

  // --- DYNAMIC DATA TRANSFORMATION ---
  const generateReportData = () => {
    const report: Record<string, Record<string, TaskRow>> = {};

    studentRecords.forEach(record => {
      const task = classTasks[record.taskId];
      if (task) {
        if (!report[task.subject]) report[task.subject] = {};
        
        // Group by Task Title
        const key = task.title;
        if (!report[task.subject][key]) {
          report[task.subject][key] = {
            title: task.title,
            type: task.type,
            term1: null,
            term2: null,
            term3: null,
            marksPerTask: task.maxScore,
            totalObtained: 0,
            totalMax: 0
          };
        }

        const termNormalized = task.term.toLowerCase().replace(/\s/g, ''); // "term1"
        
        if (['term1', 'term2', 'term3'].includes(termNormalized)) {
          const termKey = termNormalized as 'term1' | 'term2' | 'term3';
          report[task.subject][key][termKey] = record.obtainedScore;
          
          if (record.obtainedScore !== null) {
            report[task.subject][key].totalObtained += record.obtainedScore;
            report[task.subject][key].totalMax += task.maxScore;
          }
        }
      }
    });

    return report;
  };

  const reportData = selectedStudent ? generateReportData() : null;

  // ==========================================
  // 🖨️ PDF EXPORT ENGINE (jsPDF + autoTable)
  // ==========================================
  const handleDownloadPDF = async () => {
    if (!selectedStudent || !reportData || !selectedClass) return;
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth(); 
      const margin = 15;
      let yPos = 20;

      // Header
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("EXAMINATIONS COUNCIL OF ZAMBIA", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
      doc.setFontSize(12);
      doc.text("SCHOOL BASED ASSESSMENT (SBA) PERFORMANCE RECORD", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 6;
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Official Detail Grid
      doc.setFontSize(10);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 22);
      
      doc.setFont("times", "bold");
      doc.text("CANDIDATE NAME:", margin + 5, yPos + 7);
      doc.text("EXAMINATION NO:", pageWidth / 2 + 5, yPos + 7);
      doc.text("GRADE / LEVEL:", margin + 5, yPos + 16);
      doc.text("CLASS / FORM:", pageWidth / 2 + 5, yPos + 16);

      doc.setFont("times", "normal");
      doc.text(selectedStudent.name.toUpperCase(), margin + 45, yPos + 7);
      doc.text(selectedStudent.id, pageWidth / 2 + 40, yPos + 7);
      doc.text(selectedClass.grade.toUpperCase(), margin + 45, yPos + 16);
      doc.text(selectedClass.name.toUpperCase(), pageWidth / 2 + 40, yPos + 16);
      
      doc.line(pageWidth / 2, yPos, pageWidth / 2, yPos + 22); 
      doc.line(margin, yPos + 11, pageWidth - margin, yPos + 11); 
      
      yPos += 32;

      // Subject Loops
      Object.keys(reportData).sort().forEach(subject => {
        const tasks = reportData[subject];
        let subjectTotalObtained = 0;
        let subjectTotalMax = 0;
        let t1Count = 0, t2Count = 0, t3Count = 0;

        if (yPos > 240) { doc.addPage(); yPos = 20; }

        // Subject Header
        doc.setFillColor(0, 0, 0);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("times", "bold");
        doc.text(`SUBJECT: ${subject.toUpperCase()}`, margin + 3, yPos + 6);
        doc.setTextColor(0, 0, 0);
        yPos += 8;

        // Map Table Data
        const tableBody: any[][] = [];
        Object.values(tasks).forEach((task) => {
            if (task.term1 !== null) t1Count++;
            if (task.term2 !== null) t2Count++;
            if (task.term3 !== null) t3Count++;

            subjectTotalObtained += task.totalObtained;
            subjectTotalMax += task.totalMax;

            tableBody.push([
              task.title.toUpperCase(),
              task.term1 !== null ? task.term1.toString() : '-',
              task.term2 !== null ? task.term2.toString() : '-',
              task.term3 !== null ? task.term3.toString() : '-',
              task.marksPerTask.toString(),
              task.totalObtained > 0 ? task.totalObtained.toString() : '-'
            ]);
        });

        // Add Totals Footer Rows directly into the body array
        tableBody.push([
          { content: 'TOTAL TASKS PER TERM', styles: { fontStyle: 'bold' } },
          { content: t1Count.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
          { content: t2Count.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
          { content: t3Count.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
          { content: '', colSpan: 2 }
        ]);

        tableBody.push([
          { content: 'TOTAL MARKS OBTAINED', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `${subjectTotalObtained} / ${subjectTotalMax}`, styles: { fontStyle: 'bold', halign: 'center' } }
        ]);

        // Inject AutoTable with Nested Headers
        autoTable(doc, {
          startY: yPos,
          head: [
            [
              { content: 'ASSESSMENT TASKS', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
              { content: 'SCORES PER TERM', colSpan: 3, styles: { halign: 'center' } },
              { content: 'MARKS PER TASK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
              { content: 'TOTAL MARKS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ],
            ['TERM 1', 'TERM 2', 'TERM 3']
          ],
          body: tableBody,
          theme: 'grid',
          styles: { font: "times", fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 3 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
          },
          didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
        });

        yPos = (doc as any).lastAutoTable.finalY;

        // ECZ Footer Calculation Block
        if (subjectTotalMax > 0) {
          const ecz = calculateECZScore(subject, selectedClass.grade, subjectTotalObtained, subjectTotalMax);
          
          autoTable(doc, {
            startY: yPos,
            body: [
              [ecz.label.toUpperCase(), ecz.score.toString()]
            ],
            theme: 'grid',
            styles: { font: "times", fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, cellPadding: 3 },
            columnStyles: {
              0: { halign: 'right', fontStyle: 'bold' },
              1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' } // Aligns with the Total Marks column
            }
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        } else {
          yPos += 10;
        }
      });

      // Signature Area
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      yPos += 20;
      doc.setLineWidth(0.3);
      
      const sigWidth = 50;
      
      doc.line(margin, yPos, margin + sigWidth, yPos);
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.text("CLASS TEACHER SIGNATURE", margin + (sigWidth/2), yPos + 5, { align: "center" });

      doc.line(pageWidth/2 - (sigWidth/2), yPos, pageWidth/2 + (sigWidth/2), yPos);
      doc.text("DATE", pageWidth/2, yPos + 5, { align: "center" });

      doc.line(pageWidth - margin - sigWidth, yPos, pageWidth - margin, yPos);
      doc.text("HEAD TEACHER SIGNATURE", pageWidth - margin - (sigWidth/2), yPos + 5, { align: "center" });

      doc.save(`ECZ_SBA_${selectedStudent.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);

    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- RENDERING ---
  if (!schoolId) return <div className="p-12 text-center text-slate-500">Missing School Credentials.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col md:flex-row gap-6 font-sans">
      
      {/* 👈 LEFT SIDEBAR */}
      <div className="w-full md:w-80 flex-shrink-0 space-y-4 print:hidden">
        <div className="bg-white p-5 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-black text-black flex items-center gap-2 mb-4 uppercase"><Users size={20}/> Directory</h2>
          
          <label className="block text-xs font-bold text-slate-600 uppercase mb-2">1. Class Selection</label>
          <select 
            className="w-full p-3 border-2 border-black outline-none focus:bg-slate-50 bg-white mb-4 font-bold rounded-none"
            onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
            defaultValue=""
          >
            <option value="" disabled>-- CHOOSE A CLASS --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
          </select>

          {selectedClass && (
            <>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">2. Candidate Selection</label>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {students.map(student => (
                  <button
                    key={student.id} onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between border-2 transition-all ${selectedStudent?.id === student.id ? 'bg-black text-white border-black' : 'bg-white text-black border-slate-300 hover:border-black'}`}
                  >
                    <span className="truncate uppercase">{student.name}</span>
                    <ChevronRight size={16} className={selectedStudent?.id === student.id ? 'text-white' : 'text-slate-400'}/>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 👉 RIGHT AREA (The Web Preview) */}
      <div className="flex-1 max-w-[210mm] mx-auto">
        {!selectedStudent ? (
          <div className="h-full border-4 border-dashed border-slate-300 flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white min-h-[500px]">
            <FileText className="w-16 h-16 mb-4 text-slate-300" />
            <h3 className="text-xl font-black text-slate-400 uppercase">Awaiting Selection</h3>
            <p className="mt-2 max-w-md text-sm font-medium">Select a candidate from the directory to generate an official ECZ SBA Record.</p>
          </div>
        ) : (
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 animate-in fade-in relative overflow-x-auto">
            
            <div className="absolute top-0 right-0 p-4 print:hidden">
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className="bg-black text-white px-6 py-3 font-black text-sm uppercase flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                {isGeneratingPDF ? "PROCESSING..." : "EXPORT PDF"}
              </button>
            </div>

            {/* Visual Web Preview - Official Look */}
            <div className="text-center mb-10 pt-4 min-w-[800px]">
              <h1 className="text-2xl md:text-3xl font-black uppercase text-black font-serif tracking-wide">Examinations Council of Zambia</h1>
              <h2 className="text-lg md:text-xl font-bold text-black mt-2 uppercase underline decoration-2 underline-offset-4">School Based Assessment (SBA) Record</h2>
            </div>

            <div className="grid grid-cols-2 bg-white border-2 border-black mb-10 min-w-[800px]">
              <div className="p-3 border-r-2 border-b-2 border-black">
                <span className="font-bold uppercase text-xs text-slate-600">Candidate Name:</span>
                <p className="font-black text-lg uppercase mt-1">{selectedStudent.name}</p>
              </div>
              <div className="p-3 border-b-2 border-black">
                <span className="font-bold uppercase text-xs text-slate-600">Examination No:</span>
                <p className="font-black text-lg font-mono mt-1">{selectedStudent.id}</p>
              </div>
              <div className="p-3 border-r-2 border-black">
                <span className="font-bold uppercase text-xs text-slate-600">Grade / Level:</span>
                <p className="font-bold uppercase mt-1">{selectedClass?.grade}</p>
              </div>
              <div className="p-3">
                <span className="font-bold uppercase text-xs text-slate-600">Class / Form:</span>
                <p className="font-bold uppercase mt-1">{selectedClass?.name}</p>
              </div>
            </div>

            {loadingRecords ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-black w-10 h-10"/></div>
            ) : (
              <div className="space-y-12 min-w-[800px]">
                {Object.keys(reportData!).map(subject => {
                  const tasks = reportData![subject];
                  let subjectTotalObtained = 0;
                  let subjectTotalMax = 0;
                  let t1Count = 0, t2Count = 0, t3Count = 0;

                  return (
                    <div key={subject} className="border-2 border-black">
                      <div className="bg-black text-white px-4 py-2 border-b-2 border-black">
                        <h3 className="text-md font-black uppercase tracking-widest">
                          SUBJECT: {subject}
                        </h3>
                      </div>
                      
                      <div>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 border-black">
                              <th rowSpan={2} className="py-2 px-4 font-black uppercase text-xs border-r-2 border-black">Assessment Tasks</th>
                              <th colSpan={3} className="py-2 px-4 font-black uppercase text-xs text-center border-r-2 border-black border-b-2 border-black">Scores per Term</th>
                              <th rowSpan={2} className="py-2 px-4 font-black uppercase text-xs text-center border-r-2 border-black w-32">Marks Per Task</th>
                              <th rowSpan={2} className="py-2 px-4 font-black uppercase text-xs text-center w-32">Total Marks</th>
                            </tr>
                            <tr className="bg-slate-100 border-b-2 border-black">
                              <th className="py-2 px-2 font-bold uppercase text-[10px] text-center border-r-2 border-black w-24">Term 1</th>
                              <th className="py-2 px-2 font-bold uppercase text-[10px] text-center border-r-2 border-black w-24">Term 2</th>
                              <th className="py-2 px-2 font-bold uppercase text-[10px] text-center border-r-2 border-black w-24">Term 3</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(tasks).map((task, idx) => {
                              if (task.term1 !== null) t1Count++;
                              if (task.term2 !== null) t2Count++;
                              if (task.term3 !== null) t3Count++;

                              subjectTotalObtained += task.totalObtained;
                              subjectTotalMax += task.totalMax;

                              return (
                                <tr key={idx} className="border-b border-slate-300 last:border-b-2 last:border-black hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 font-bold text-black border-r-2 border-black">
                                    {task.title.toUpperCase()} 
                                    <span className="block text-[10px] text-slate-500 uppercase mt-1">[{task.type}]</span>
                                  </td>
                                  <td className="py-3 px-2 text-center font-bold text-black border-r-2 border-black bg-white">
                                    {task.term1 !== null ? task.term1 : '-'}
                                  </td>
                                  <td className="py-3 px-2 text-center font-bold text-black border-r-2 border-black bg-white">
                                    {task.term2 !== null ? task.term2 : '-'}
                                  </td>
                                  <td className="py-3 px-2 text-center font-bold text-black border-r-2 border-black bg-white">
                                    {task.term3 !== null ? task.term3 : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-black border-r-2 border-black">
                                    {task.marksPerTask}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-black">
                                    {task.totalObtained > 0 ? task.totalObtained : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                            
                            {/* Subtotals Footer */}
                            <tr className="border-b border-slate-300 bg-slate-100">
                              <td className="py-3 px-4 font-black uppercase text-xs border-r-2 border-black text-right">Total Tasks Per Term</td>
                              <td className="py-3 px-2 text-center font-black text-black border-r-2 border-black">{t1Count}</td>
                              <td className="py-3 px-2 text-center font-black text-black border-r-2 border-black">{t2Count}</td>
                              <td className="py-3 px-2 text-center font-black text-black border-r-2 border-black">{t3Count}</td>
                              <td colSpan={2} className="bg-slate-200"></td>
                            </tr>

                            {/* Grand Total Footer */}
                            <tr className="border-b-2 border-black bg-slate-100">
                              <td colSpan={5} className="py-3 px-4 font-black uppercase text-sm border-r-2 border-black text-right">Total Marks Obtained</td>
                              <td className="py-3 px-4 text-center font-black text-black text-lg">{subjectTotalObtained} / {subjectTotalMax}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* ECZ Calculation Output */}
                        {subjectTotalMax > 0 && (
                          <div className="bg-black text-white flex justify-end">
                            {(() => {
                              const ecz = calculateECZScore(subject, selectedClass!.grade, subjectTotalObtained, subjectTotalMax);
                              return (
                                <>
                                  <span className="py-3 px-4 font-black uppercase border-l-2 border-slate-800 w-48 text-right">{ecz.label}:</span>
                                  <span className="py-3 px-4 font-black text-xl border-l-2 border-slate-800 w-32 text-center">{ecz.score}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {Object.keys(reportData!).length === 0 && (
                  <p className="text-center py-16 text-slate-400 font-bold uppercase border-2 border-dashed border-slate-300">No Assessment Records Found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}