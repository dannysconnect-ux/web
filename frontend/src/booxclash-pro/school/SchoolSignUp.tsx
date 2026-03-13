import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 
import { School, Loader2, ArrowRight, AlertCircle, LogIn } from 'lucide-react';

export default function SchoolSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    schoolName: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSignup = async () => {
    // Basic validation
    if(!formData.email || !formData.password || !formData.schoolName) return;
    
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Create New Account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      if (!user) throw new Error("Authentication failed");

      // 2. Ensure Display Name is set
      if (!user.displayName) {
        await updateProfile(user, { displayName: `Admin - ${formData.schoolName}` });
      }

      // 3. Create School & User Record in Firestore
      // We generate a new ID for the school
      const schoolRef = doc(collection(db, "schools")); 
      const userDocRef = doc(db, "users", user.uid);
      
      await Promise.all([
        setDoc(schoolRef, {
          adminId: user.uid,
          schoolName: formData.schoolName,
          email: formData.email,
          phone: formData.phone,
          
          // ---------------------------------------------------
          // 🛑 UPDATED DEFAULT VALUES
          // ---------------------------------------------------
          maxTeachers: 0,             // Start with 0 (Requires payment to increase)
          subscriptionStatus: false,  // Start as inactive/false
          
          createdAt: new Date(),
          customTemplate: null 
        }),
        
        setDoc(userDocRef, {
          role: 'school_admin',
          schoolId: schoolRef.id,
          email: formData.email,
          name: formData.schoolName
        })
      ]);

      // 4. Force Redirect
      navigate('/school-portal');

    } catch (error: any) {
      console.error(error);
      
      // Handle "Email already in use" gracefully
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("This email is already registered. Please Login instead.");
      } else {
        setErrorMsg(error.message || "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl">
        
        <div className="p-8 w-full">
          <div className="mb-8 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <School size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Register School</h1>
            <p className="text-slate-500 text-sm">Create your admin account to get started</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">School Name</label>
              <input 
                type="text" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                value={formData.schoolName} 
                onChange={e => setFormData({...formData, schoolName: e.target.value})} 
                placeholder="e.g. Lusaka High School" 
              />
            </div>
            
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                <input 
                  type="email" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="admin@school.zm" 
                />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="097..." 
                />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Create Password</label>
              <input 
                type="password" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="••••••••" 
              />
            </div>

            <button 
              onClick={handleSignup} 
              disabled={!formData.schoolName || !formData.email || !formData.password || loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Creating Account...
                </>
              ) : (
                <>
                  Complete Registration <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>

          {/* --- LOGIN LINK --- */}
          <div className="mt-6 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-500 text-sm mb-3">Already have an account?</p>
            <button 
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 w-full p-3 text-indigo-600 bg-indigo-50 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
            >
                <LogIn size={18} /> Login to Portal
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}