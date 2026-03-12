import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { School, User } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'admin' | 'teacher'>('teacher');
  const [loading, setLoading] = useState(false);

  // Admin Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Teacher Inputs
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (mode === 'admin') {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/admin-dashboard');
      } else {
        // Teacher Login Logic (Custom DB Check)
        const q = query(
            collection(db, "teachers"), 
            where("loginId", "==", loginId), 
            where("pin", "==", pin)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) throw new Error("Invalid ID or PIN");
        
        const teacherData = snapshot.docs[0].data();
        
        // 1. Get the School's Custom Template
        // 2. Navigate to Generator with context
        navigate('/teacher-dashboard', { state: { 
            teacherName: teacherData.name, 
            schoolId: teacherData.schoolId 
        }});
      }
    } catch (err: any) {
      alert("Login Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        
        {/* TABS */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setMode('teacher')}
            className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 ${mode === 'teacher' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}
          >
            <User size={18} /> Teacher Login
          </button>
          <button 
            onClick={() => setMode('admin')}
            className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 ${mode === 'admin' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}
          >
            <School size={18} /> School Admin
          </button>
        </div>

        <div className="p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
            {mode === 'admin' ? 'Manage Your School' : 'Access Lesson Planner'}
          </h2>

          {mode === 'admin' ? (
            <>
              <input type="email" placeholder="Admin Email" className="w-full p-3 border rounded-lg" onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" onChange={e => setPassword(e.target.value)} />
            </>
          ) : (
            <>
              <input type="text" placeholder="Teacher ID (e.g. BANDA-882)" className="w-full p-3 border rounded-lg font-mono uppercase" onChange={e => setLoginId(e.target.value.toUpperCase())} />
              <input type="password" placeholder="PIN" className="w-full p-3 border rounded-lg font-mono" maxLength={4} onChange={e => setPin(e.target.value)} />
            </>
          )}

          <button onClick={handleLogin} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition">
            {loading ? "Verifying..." : "Enter Dashboard"}
          </button>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400">
            {mode === 'teacher' ? "Don't have an ID? Contact your School Admin." : <span onClick={() => navigate('/signup')} className="cursor-pointer underline">Register a New School</span>}
        </div>

      </div>
    </div>
  );
}