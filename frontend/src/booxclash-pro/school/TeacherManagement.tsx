import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  UserPlus, 
  Trash2, 
  Check,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Send,
  Sliders,
  Users,
  Zap,
  Clock
} from 'lucide-react';

// 🆕 IMPORT FROM SCHEMA
import { TeacherData } from './schema';

/* ---------------------------------------
   ENV-AWARE BACKEND URL
---------------------------------------- */
const API_BASE_URL =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : 'https://booxclash-pro.onrender.com');

interface TeacherManagerProps {
  schoolId: string;
  teachers: TeacherData[]; // 👈 Using the imported schema
  maxTeachers?: number; 
  currentCount: number;
}

export default function TeacherManagement({
  schoolId,
  teachers,
  currentCount
}: TeacherManagerProps) {

  // --- STATE ---
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Subscription / Request State
  const [sliderValue, setSliderValue] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'termly'>('termly');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Subjects & Forms
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [gradeWarning, setGradeWarning] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    grade: '',
    subjects: [] as string[]
  });

  // --- 1. LISTEN TO SCHOOL DATA (Credits & Requests) ---
  useEffect(() => {
    if (!schoolId) return;
    const unsub = onSnapshot(doc(db, "schools", schoolId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchoolData(data);
        if (!data.pendingRequest && data.maxTeachers) {
            setSliderValue(data.maxTeachers);
        }
      }
    });
    return () => unsub();
  }, [schoolId]);

  const maxTeachers = schoolData?.maxTeachers || 0;
  const currentCredits = schoolData?.credits || 0;
  const pendingRequest = schoolData?.pendingRequest || null;
  const isLimitReached = currentCount >= maxTeachers;

  /* ---------------------------------------
      PRICING & CREDITS CALCULATOR
  ---------------------------------------- */
  const calculatePlan = (count: number, cycle: 'monthly' | 'termly') => {
    const isBulk = count >= 5;
    let rate = 0;
    
    if (cycle === 'monthly') {
        rate = isBulk ? 35 : 50; 
    } else {
        rate = isBulk ? 105 : 120;
    }

    const totalCost = count * rate;
    const creditsPerTeacher = cycle === 'monthly' ? 80 : 300;
    const totalCredits = count * creditsPerTeacher;

    return {
      totalCost,
      ratePerTeacher: rate,
      totalCredits,
      creditsPerTeacher,
      isBulk
    };
  };

  const plan = calculatePlan(sliderValue, billingCycle);

  /* ---------------------------------------
      HANDLE SEND REQUEST
  ---------------------------------------- */
  const handleSendRequest = async () => {
    setSubmittingRequest(true);
    try {
      const schoolRef = doc(db, "schools", schoolId);
      
      await updateDoc(schoolRef, {
        pendingRequest: {
          requestedTeachers: sliderValue,
          requestedCredits: plan.totalCredits,
          amount: plan.totalCost,
          billingCycle: billingCycle,
          status: 'pending_approval',
          requestedAt: serverTimestamp()
        }
      });
      
      alert("Request sent to System Admin! Credits will appear upon approval.");
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Failed to send request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  /* ---------------------------------------
      DATA FETCHING
  ---------------------------------------- */
  const fetchSubjectsForGrade = async (grade: string) => {
    if (!grade) return;
    setLoadingSubjects(true);
    setGradeWarning(null);
    setAvailableSubjects([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/get-subjects/${encodeURIComponent(grade)}`);
      if (!response.ok) throw new Error(`Server error`);
      const data = await response.json();
      if (Array.isArray(data.subjects) && data.subjects.length > 0) setAvailableSubjects(data.subjects);
      else setGradeWarning(`No subjects found for "${grade}".`);
    } catch (err) {
      setGradeWarning("Connection error.");
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (!formData.grade) return;
    const t = setTimeout(() => fetchSubjectsForGrade(formData.grade), 400);
    return () => clearTimeout(t);
  }, [formData.grade]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const grade = e.target.value;
    setFormData(prev => ({ ...prev, grade, subjects: [] }));
    setAvailableSubjects([]);
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject) 
        ? prev.subjects.filter(s => s !== subject) 
        : [...prev.subjects, subject]
    }));
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) return alert("Limit reached. Please request an upgrade.");
    if (!formData.name || !formData.grade || formData.subjects.length === 0) return alert("Please fill all fields");

    setLoading(true);
    try {
      const prefix = formData.name.slice(0, 2).toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      
      // 🆕 Create the typed object
      const newTeacher: Omit<TeacherData, 'id'> = {
        schoolId: schoolId,
        name: formData.name,
        email: formData.email,
        grade: formData.grade,
        subjects: formData.subjects,
        loginCode: `T-${prefix}-${rand}`,
        pin: Math.floor(10000 + Math.random() * 90000).toString(),
        createdAt: serverTimestamp()
      };
      
      // 🆕 Save directly into the school's subcollection
      await addDoc(collection(db, `schools/${schoolId}/teachers`), newTeacher);

      setFormData({ name: '', email: '', grade: '', subjects: [] });
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (confirm("Remove this teacher?")) {
      // 🆕 Target the subcollection document for deletion
      await deleteDoc(doc(db, `schools/${schoolId}/teachers`, teacherId));
    }
  };

  /* ---------------------------------------
      RENDER
  ---------------------------------------- */
  return (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto pb-10">

      {/* =========================================================
          💳 PLAN & CREDITS PANEL
      ========================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={20} className="text-indigo-600"/> 
              Capacity & Credits
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-sm text-slate-500">Current Balance:</span>
               <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                 <Zap size={12} fill="currentColor" /> {currentCredits} Credits
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setBillingCycle('monthly')}
              disabled={!!pendingRequest}
              className={`px-3 py-1 text-sm font-bold rounded-md transition ${
                billingCycle === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button 
               onClick={() => setBillingCycle('termly')}
               disabled={!!pendingRequest}
               className={`px-3 py-1 text-sm font-bold rounded-md transition ${
                billingCycle === 'termly' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Termly (3 Mo)
            </button>
          </div>
        </div>

        {/* Plan Controls */}
        {pendingRequest ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center animate-in fade-in">
             <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={24} />
             </div>
             <h3 className="font-bold text-amber-900 text-lg">Verification Pending</h3>
             <p className="text-amber-700 max-w-md mx-auto mt-2 text-sm">
                You have requested <strong>{pendingRequest.requestedTeachers} Teachers</strong> ({pendingRequest.requestedCredits} Credits). 
                The System Admin is reviewing your payment of <strong>K{pendingRequest.amount}</strong>.
             </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex justify-between font-bold text-slate-700">
                  <span className="text-xs">1 Teacher</span>
                  <span className="text-indigo-600 text-lg">{sliderValue} Teachers</span>
                  <span className="text-xs">50 Teachers</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={sliderValue} 
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="text-xs text-slate-400 flex flex-col gap-1">
                 <div className="flex justify-between">
                    <span>Includes <strong>{plan.totalCredits} Credits</strong></span>
                    <span className="text-indigo-500 font-bold">({plan.creditsPerTeacher} per teacher)</span>
                 </div>
                 {plan.isBulk && <span className="text-green-600 font-bold flex items-center gap-1"><Check size={10}/> Bulk Discount Active (K{plan.ratePerTeacher}/teacher)</span>}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Amount</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      K{plan.totalCost}
                    </span>
                    <span className="text-slate-500 text-xs">
                      /{billingCycle === 'monthly' ? 'mo' : 'term'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Credits</p>
                  <span className="text-xl font-bold text-indigo-600 flex items-center justify-end gap-1">
                    <Zap size={16} fill="currentColor"/> {plan.totalCredits}
                  </span>
                </div>
              </div>

              {sliderValue !== maxTeachers ? (
                <button 
                  onClick={handleSendRequest}
                  disabled={submittingRequest}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  {submittingRequest ? (
                    <Loader2 className="animate-spin" size={16}/>
                  ) : (
                    <Send size={16}/>
                  )}
                  {submittingRequest ? "Sending..." : "Send Request to Admin"}
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400 font-medium py-2 bg-slate-100 rounded">
                  Current Active Plan
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          👥 TEACHER DIRECTORY
      ========================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Directory</h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
               Capacity Used: <span className="font-mono font-bold">{currentCount} / {maxTeachers}</span>
            </p>
          </div>

          {!isAdding && !isLimitReached && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition"
            >
              <UserPlus size={18} /> Add Teacher
            </button>
          )}

          {isLimitReached && !isAdding && (
             <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-100">
                <AlertTriangle size={14} /> Capacity Full
             </div>
          )}
        </div>

        {/* ADD FORM */}
        {isAdding && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2">
            <form onSubmit={handleAddTeacher} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                  <input 
                    required placeholder="e.g. John Doe" 
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
              </div>
              <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email (Optional)</label>
                  <input 
                    placeholder="teacher@school.com" 
                    className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
              </div>
              
              <div className="relative md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Grade / Form</label>
                <select 
                  required
                  className="w-full p-3 rounded-lg border appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.grade}
                  onChange={handleGradeChange}
                >
                  <option value="">Select Grade to Load Subjects</option>
                  <optgroup label="Forms">
                    <option>Form 1</option><option>Form 2</option>
                  </optgroup>
                  <optgroup label="Grades">
                    {[1,2,3,4,5,6,7,10,11,12].map(g => <option key={g}>{`Grade ${g}`}</option>)}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 bottom-4 text-slate-400 pointer-events-none" size={14} />
              </div>

              {gradeWarning && (
                <div className="md:col-span-2 text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                  <AlertTriangle size={14}/> {gradeWarning}
                </div>
              )}

              <div className="md:col-span-2 border p-4 rounded-xl bg-white shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-slate-400 uppercase font-bold">Assign Subjects</p>
                    <span className="text-xs text-indigo-600 font-bold">{formData.subjects.length} Selected</span>
                 </div>
                 
                 {loadingSubjects ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                        <Loader2 className="animate-spin" size={16}/> Loading Syllabus...
                    </div>
                 ) : availableSubjects.length > 0 ? (
                   <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                     {availableSubjects.map(sub => (
                       <button
                         type="button" key={sub} onClick={() => toggleSubject(sub)}
                         className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                           formData.subjects.includes(sub) 
                             ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                             : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                         }`}
                       >
                         {sub}
                       </button>
                     ))}
                   </div>
                 ) : (
                    <div className="text-slate-400 text-sm text-center py-4 italic">
                        Select a Grade above to view subjects.
                    </div>
                 )}
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex-1 md:flex-none">
                   {loading ? 'Saving...' : 'Save Teacher'}
                </button>
                <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 px-4 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* LIST */}
        <div className="flex-1 p-6">
          {teachers.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                <Users size={48} className="mb-4 opacity-20"/>
                <p>No teachers added yet.</p>
             </div>
          ) : (
            <div className="grid gap-3">
                {teachers.map(t => (
                    <div key={t.id} className="border border-slate-100 rounded-xl p-4 flex justify-between items-center hover:bg-slate-50 transition group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                {t.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{t.name}</h3>
                                <div className="text-xs text-slate-500 flex gap-2 items-center">
                                    <span className="bg-white border px-1.5 py-0.5 rounded font-mono">{t.grade}</span>
                                    <span>• {t.subjects.length} Subjects</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-[10px] uppercase font-bold text-slate-400">Login ID</div>
                                <div className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{t.loginCode}</div>
                            </div>
                            <button onClick={() => t.id && handleDelete(t.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}