import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInAnonymously, updateProfile } from 'firebase/auth'; // 👈 Added updateProfile
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 
import { School, User, Lock, ArrowRight, Loader2, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    loginId: '' // This stores the input value (e.g. T-KO-2450)
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'admin') {
        // ==========================
        // 🏫 ADMIN LOGIN FLOW
        // ==========================
        if (!formData.email || !formData.password) throw new Error("Please fill in all fields");
        
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        navigate('/school-portal'); 

      } else {
        // ==========================
        // 🍎 TEACHER LOGIN FLOW
        // ==========================
        if (!formData.loginId) throw new Error("Enter your Login ID");

        // 1. Verify Credentials using a Collection Group Query
        const q = query(
          collectionGroup(db, 'teachers'), 
          where('loginCode', '==', formData.loginId) 
        );
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error("Invalid Login ID");
        }

        const teacherDoc = snapshot.docs[0];
        const teacherData = teacherDoc.data();

        // 2. Extract the schoolId safely
        const discoveredSchoolId = teacherData.schoolId || teacherDoc.ref.parent.parent?.id;

        if (!discoveredSchoolId) {
          throw new Error("Database error: Teacher is not attached to a school.");
        }

        // 3. Sign in Anonymously
        const { user } = await signInAnonymously(auth);

        // 🆕 4. Update the Auth Profile with the Teacher's actual name!
        if (user) {
          await updateProfile(user, {
            displayName: teacherData.name
          });
        }

        // 5. Save Context to local storage
        localStorage.setItem('teacherName', teacherData.name);
        localStorage.setItem('schoolId', discoveredSchoolId); 
        localStorage.setItem('teacherDocId', teacherDoc.id);

        // 6. Redirect to Teacher Dashboard
        navigate('/teacher-dashboard'); 
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Role Toggle Switch */}
        <div className="flex p-2 bg-slate-100 m-2 rounded-2xl">
          <button 
            onClick={() => setRole('teacher')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <GraduationCap size={18} /> Teacher
          </button>
          <button 
            onClick={() => setRole('admin')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <School size={18} /> Admin
          </button>
        </div>

        <div className="p-8 pt-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900">
              {role === 'admin' ? 'School Portal' : 'Teacher Access'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {role === 'admin' 
                ? 'Manage your school credits and teachers' 
                : 'Enter your Login ID to start planning'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* --- ADMIN INPUTS --- */}
            {role === 'admin' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Address</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-colors"
                      placeholder="admin@school.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-colors"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* --- TEACHER INPUTS (ID ONLY) --- */
              <div className="space-y-4 animate-in fade-in slide-in-from-left">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Login ID</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono uppercase"
                      placeholder="e.g. T-JO-8291"
                      value={formData.loginId}
                      onChange={e => setFormData({...formData, loginId: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 mt-6 ${
                role === 'admin' 
                  ? 'bg-slate-900 hover:bg-slate-800' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {role === 'admin' ? 'Login to Portal' : 'Start Planning'} 
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Admin Registration Link */}
          {role === 'admin' && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => navigate('/signup')}
                className="text-slate-400 text-sm hover:text-slate-600 transition"
              >
                Don't have a school account? <span className="font-bold text-slate-600">Register here</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}