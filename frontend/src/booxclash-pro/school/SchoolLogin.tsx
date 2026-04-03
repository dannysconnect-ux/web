import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { School, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'admin' | 'teacher'>('teacher');
  const [loading, setLoading] = useState(false);

  // Admin Inputs
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Teacher Inputs
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherLoginId, setTeacherLoginId] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (mode === 'admin') {
        // --- ADMIN LOGIN ---
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        navigate('/admin-dashboard');
      } else {
        // --- TEACHER LOGIN ---
        // As requested: Teacher uses their Email as the username, and the Login ID as the password
        
        // 1. Authenticate the user in Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
            auth, 
            teacherEmail.toLowerCase().trim(), 
            teacherLoginId.toUpperCase().trim()
        );
        
        // 2. Fetch their metadata from the database 
        // Using collectionGroup to find the teacher across any school
        const q = query(
            collectionGroup(db, "teachers"), 
            where("email", "==", teacherEmail.toLowerCase().trim())
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            // Even if Auth succeeded, if they aren't in the database, block access
            throw new Error("Teacher profile not found in the database. Contact your Admin.");
        }
        
        const teacherData = snapshot.docs[0].data();
        
        // 3. Navigate with context to the Teacher Dashboard
        navigate('/teacher-dashboard', { state: { 
            teacherName: teacherData.name, 
            schoolId: teacherData.schoolId 
        }});
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
         alert("Login Failed: Incorrect Email or Password/ID.");
      } else {
         alert("Login Failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* TABS */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setMode('teacher')}
            className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'teacher' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
          >
            <User size={18} /> Teacher Login
          </button>
          <button 
            onClick={() => setMode('admin')}
            className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'admin' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
          >
            <School size={18} /> School Admin
          </button>
        </div>

        <div className="p-8 space-y-5">
          <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">
                {mode === 'admin' ? 'Manage Your School' : 'Teacher Portal'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'admin' ? 'Sign in to access the admin dashboard' : 'Sign in to access your lesson planner'}
              </p>
          </div>

          {mode === 'admin' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email</label>
                 <input 
                    type="email" 
                    placeholder="admin@school.com" 
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    onChange={e => setAdminEmail(e.target.value)} 
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                 <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    onChange={e => setAdminPassword(e.target.value)} 
                 />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teacher Email</label>
                 <input 
                    type="email" 
                    placeholder="your.email@school.com" 
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    onChange={e => setTeacherEmail(e.target.value)} 
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Login ID (Password)</label>
                 <input 
                    type="password" 
                    placeholder="e.g. T-JO-1234" 
                    className="w-full p-3 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    onChange={e => setTeacherLoginId(e.target.value.toUpperCase())} 
                 />
                 <p className="text-[10px] text-slate-400 mt-1">Use the Login ID provided by your administrator.</p>
              </div>
            </div>
          )}

          <button 
             onClick={handleLogin} 
             disabled={loading} 
             className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2 mt-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 border-t border-slate-100">
            {mode === 'teacher' ? (
                <span>Having trouble? Contact your School Administrator.</span>
            ) : (
                <span>New school? <span onClick={() => navigate('/signup')} className="text-indigo-600 font-bold cursor-pointer hover:underline">Register Here</span></span>
            )}
        </div>

      </div>
    </div>
  );
}