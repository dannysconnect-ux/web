import React, { useState, useRef, useEffect } from 'react';
import {
  Building,
  Users,
  PlusCircle,
  FileText,
  CheckCircle,
  Sparkles,
  UploadCloud,
  Loader2,
  ArrowLeft,
  Trash2,
  UserX,
  AlertCircle
} from 'lucide-react';

import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch, 
  doc, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';

// 🆕 IMPORT FROM SCHEMA
import { ClassData, StudentData } from './schema';

interface SBAManagerProps {
  schoolId?: string | null;
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : 'https://booxclash-pro.onrender.com');

const AVAILABLE_GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  'Form 1', 'Form 2'
];

export default function AdminClassManager({ schoolId }: SBAManagerProps) {
  // --- STATES ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Grade 10'); // Default to secondary

  // Route-driven Subjects State
  const [autoPopulatedSubjects, setAutoPopulatedSubjects] = useState<string[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage View States
  const [managingClass, setManagingClass] = useState<ClassData | null>(null);
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // --- API FETCH: REAL-TIME FIRESTORE CLASSES ---
  useEffect(() => {
    if (!schoolId) return;
    
    const q = query(collection(db, `schools/${schoolId}/classes`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassData[];
      setClasses(fetchedClasses);
    });
    
    return () => unsubscribe();
  }, [schoolId]);

  // --- API FETCH: REAL-TIME FIRESTORE STUDENTS ---
  useEffect(() => {
    if (!managingClass || !schoolId) return;
    setIsLoadingStudents(true);
    
    const q = query(
      collection(db, `schools/${schoolId}/students`), 
      where("classId", "==", managingClass.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStudents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudentData[];
      
      fetchedStudents.sort((a, b) => a.name.localeCompare(b.name));
      setClassStudents(fetchedStudents);
      setIsLoadingStudents(false);
    });

    return () => unsubscribe();
  }, [managingClass, schoolId]);

  // --- 🆕 API FETCH: SMART SUBJECT RESOLVER ---
// --- 🆕 API FETCH: SMART SUBJECT RESOLVER ---
  useEffect(() => {
    const fetchSubjectsForGrade = async () => {
      if (!newClassGrade) return;
      setIsLoadingSubjects(true);
      setAutoPopulatedSubjects([]);

      try {
        // Safely extract the number from the string (e.g., "Grade 10" -> 10)
        const gradeMatch = newClassGrade.match(/\d+/);
        const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
        
        // Primary is Grades 1 through 7
        const isPrimary = gradeNum >= 1 && gradeNum <= 7;

        if (isPrimary) {
          // If Primary: Fetch from the primary config JSON
          const res = await fetch(`${API_BASE_URL}/api/sba/config/primary`);
          if (res.ok) {
            const data = await res.json();
            const primarySubjects = data?.Primary_SBA_Comprehensive_Guidelines?.Subjects || {};
            const gradeKey = newClassGrade.replace(' ', '_'); // e.g. "Grade_5"
            const mapped: string[] = [];

            Object.keys(primarySubjects).forEach(sub => {
              if (primarySubjects[sub][gradeKey]) {
                mapped.push(sub.replace(/_/g, ' '));
              }
            });
            setAutoPopulatedSubjects(mapped);
          }
        } else {
          // 🆕 If Secondary (Grade 8+): Pass the grade to our new smart backend route!
          const res = await fetch(`${API_BASE_URL}/api/sba/subjects/${encodeURIComponent(newClassGrade)}`);
          if (res.ok) {
            const data = await res.json();
            setAutoPopulatedSubjects(data.subjects || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjectsForGrade();
  }, [newClassGrade]);


  // --- ACTIONS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') setSelectedFile(file);
      else alert('Please upload a valid PDF document.');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return alert('Class name is required.');
    if (!selectedFile) return alert('Please upload the student roster PDF.');
    if (!schoolId) return alert('School ID is missing.');

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/sba/extract-roster`, {
        method: 'POST',
        body: formData, 
      });

      if (!response.ok) throw new Error('Failed to extract roster');
      const data = await response.json();
      
      const extractedStudents: any[] = data.students || [];
      const extractedCount = extractedStudents.length || data.count || 0;
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newClassData: Omit<ClassData, 'id'> = {
        name: newClassName,
        grade: newClassGrade,
        code: joinCode,
        subjects: autoPopulatedSubjects,
        studentCount: extractedCount,
        rosterFilename: selectedFile.name,
        schoolId: schoolId,
        createdAt: serverTimestamp()
      };
      const classRef = await addDoc(collection(db, `schools/${schoolId}/classes`), newClassData);

      if (extractedStudents.length > 0) {
        const batch = writeBatch(db);
        extractedStudents.forEach(studentObj => {
          const studentRef = doc(collection(db, `schools/${schoolId}/students`)); 
          const newStudentData: Omit<StudentData, 'id'> = {
            name: studentObj.name || "Unknown Student", 
            classId: classRef.id,
            schoolId: schoolId,
            createdAt: serverTimestamp()
          };
          batch.set(studentRef, newStudentData);
        });
        await batch.commit();
      }

      setNewClassName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      alert(`Class Created! Saved ${extractedCount} students to database. Code: ${joinCode}`);
    } catch (error: any) {
      console.error('Error creating class:', error);
      alert(`Error extracting roster: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!schoolId) return;
    const confirmDelete = window.confirm(`Are you sure you want to remove ${studentName}?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, `schools/${schoolId}/students`, studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student.");
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!schoolId) return;
    const confirmDelete = window.confirm(
      `WARNING: Are you sure you want to delete "${className}"?\n\nThis will permanently delete the class AND all associated students. This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const q = query(
        collection(db, `schools/${schoolId}/students`), 
        where("classId", "==", classId)
      );
      
      const studentSnapshots = await getDocs(q);
      const batch = writeBatch(db);

      studentSnapshots.docs.forEach((studentDoc) => {
        batch.delete(studentDoc.ref);
      });

      const classRef = doc(db, `schools/${schoolId}/classes`, classId);
      batch.delete(classRef);

      await batch.commit();
      
      alert(`Deleted class "${className}" and ${studentSnapshots.size} students.`);
    } catch (error) {
      console.error("Error deleting class and students:", error);
      alert("Failed to delete the class. Please try again.");
    }
  };

  // --- RENDERING ---
  if (!schoolId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-rose-500" />
        <h2 className="text-xl font-bold">School ID Missing</h2>
        <p>Could not locate your school profile. Please refresh the page.</p>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MANAGE CLASS STUDENTS
  // ==========================================
  if (managingClass) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto p-6">
        <button 
          onClick={() => setManagingClass(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          <ArrowLeft size={20} /> Back to Classes
        </button>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">{managingClass.name}</h1>
            <p className="text-slate-500 font-medium">{managingClass.grade} • Join Code: <span className="text-indigo-600 font-mono">{managingClass.code}</span></p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-lg border border-indigo-100 flex items-center gap-2">
            <Users size={18} />
            {classStudents.length} Students
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingStudents ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>
          ) : classStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <UserX className="w-12 h-12 mx-auto mb-3 text-slate-300"/>
              <p className="font-bold">No students found.</p>
              <p className="text-sm">The PDF might not have parsed correctly.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Student Name</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">System ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{student.name}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{student.id}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteStudent(student.id!, student.name)}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded transition-colors"
                        title="Remove Student"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto p-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Building size={32} /></div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Class & Roster Management</h1>
          <p className="text-slate-500">Create classes, auto-assign ECZ subjects, and upload student PDFs.</p>
        </div>
      </div>

      {/* CREATE CLASS FORM */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <PlusCircle className="text-indigo-500" size={20}/> Create New Class Cohort
        </h2>
        
        <form onSubmit={handleCreateClass} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class Name</label>
              <input 
                type="text" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter class name (e.g., Grade 10 Blue)" 
                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white" 
              />
            </div>
            
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Grade Level</label>
              <select 
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white cursor-pointer"
              >
                {AVAILABLE_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
              <input 
                type="file" 
                accept=".pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {!selectedFile ? (
                <>
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3"><UploadCloud size={24} /></div>
                  <p className="font-bold text-slate-700">Upload Student Roster</p>
                  <p className="text-xs text-slate-500 mt-1">Drag & drop or click to upload PDF</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3"><FileText size={24} /></div>
                  <p className="font-bold text-emerald-700 truncate w-full px-4">{selectedFile.name}</p>
                  <button type="button" onClick={(e) => { e.preventDefault(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-xs text-rose-500 mt-2 hover:underline z-10 relative">Remove File</button>
                </>
              )}
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl">
               <div className="flex items-center gap-2 mb-3">
                 <Sparkles className="text-indigo-500" size={16} />
                 <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider">Available Subjects for {newClassGrade}</h4>
               </div>
               
               {isLoadingSubjects ? (
                  <div className="flex items-center gap-2 text-indigo-400 py-2">
                    <Loader2 size={16} className="animate-spin" /> Fetching available subjects...
                  </div>
               ) : autoPopulatedSubjects.length > 0 ? (
                 <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                   {autoPopulatedSubjects.map(subject => (
                     <span key={subject} className="bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                       {subject}
                     </span>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-indigo-400 italic">No subject files found for this grade.</p>
               )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isUploading}
              className="bg-slate-900 disabled:bg-slate-400 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {isUploading ? <><Loader2 size={18} className="animate-spin"/> Parsing PDF Roster...</> : <><PlusCircle size={18}/> Create Class & Extract Students</>}
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE CLASSES GRID */}
      {classes.length > 0 && (
        <div className="pt-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle className="text-emerald-500" size={20}/> Active Classes</h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-xl text-slate-800">{cls.name}</h4>
                    <span className="inline-block mt-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">{cls.grade}</span>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1"><Users size={14}/> {cls.studentCount} Students</span>
                  </div>
                </div>
                
                <div className="mb-6 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                   <FileText size={14} className="text-slate-400"/> Parsed from: <span className="font-mono font-bold">{cls.rosterFilename}</span>
                </div>
                
                <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center text-white">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">Teacher Join Code</p>
                    <p className="font-mono text-2xl font-black text-emerald-400 tracking-widest">{cls.code}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setManagingClass(cls)}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Manage
                    </button>
                    <button 
                      onClick={() => handleDeleteClass(cls.id!, cls.name)}
                      className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white px-3 py-2 rounded-lg transition-colors"
                      title="Delete Class & Students"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}