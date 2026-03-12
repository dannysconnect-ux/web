import { useState, useEffect } from 'react';
import { Loader2, Briefcase, Phone, MapPin, CheckCircle2, Gift } from 'lucide-react';

import {
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  auth,
  googleProvider,
  db,
  analytics,
  logEvent
} from './firebase';

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://booxclash-pro.onrender.com');

export default function Signup() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Profile Completion States
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pendingRole, setPendingRole] = useState("teacher");

  // Referral State
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Fixed role
  const role = "teacher";

  // =====================================================
  // 1. SESSION & REFERRAL CHECK
  // =====================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      console.log("Referred by:", ref);
    }

    if (analytics) {
      logEvent(analytics as any, "screen_view" as any, {
        screen_name: "Signup",
        role_selection: role
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));

          if (snap.exists()) {
            const userData = snap.data();
            if (userData.profileComplete) {
              handleRedirection(userData.role || "teacher");
            } else {
              setPendingRole(userData.role || "teacher");
              setShowProfileForm(true);
              setIsPageLoading(false);
            }
          } else {
            setIsPageLoading(false);
          }
        } catch (error) {
          console.error("Session check error:", error);
          setIsPageLoading(false);
        }
      } else {
        setIsPageLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // =====================================================
  // 2. GOOGLE LOGIN
  // =====================================================
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      let targetRole = role;

      // NEW USER
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "Unknown User", 
          email: user.email || "No Email",          
          role: "teacher",
          credits: 3,
          profileComplete: false, 
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          tpin_associated: "2003813268",
          authProvider: "google",
          referred_by: referralCode || null 
        });

        if (referralCode) {
          try {
            await fetch(`${API_BASE_URL}/api/reward-referral`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                new_user_uid: user.uid,
                referred_by_uid: referralCode
              })
            });
          } catch (err) {
            console.error("Referral reward failed:", err);
          }
        }

        try {
          await fetch(`${API_BASE_URL}/api/welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.displayName || "Teacher"
            })
          });
        } catch (err) {
          console.error("Welcome email failed:", err);
        }

        if (analytics) {
          logEvent(analytics as any, "sign_up" as any, { method: "google", role: "teacher" });
        }

        setPendingRole("teacher");
        setShowProfileForm(true);
      } 
      // EXISTING USER
      else {
        const userData = snap.data();
        targetRole = userData.role || "teacher";

        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });

        if (analytics) {
          logEvent(analytics as any, "login" as any, { method: "google" });
        }

        if (userData.profileComplete) {
          handleRedirection(targetRole);
        } else {
          setPendingRole(targetRole);
          setShowProfileForm(true);
        }
      }
    } catch (error: any) {
      alert("Login failed: " + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // =====================================================
  // 3. PROFILE SUBMISSION HANDLER
  // =====================================================
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !address.trim()) {
      alert("Please fill in both your phone number and address.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user session found.");

      await setDoc(doc(db, "users", user.uid), {
        phoneNumber: phone,
        address: address,
        profileComplete: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      handleRedirection(pendingRole);

    } catch (error: any) {
      console.error("Profile save error:", error);
      alert("Failed to save your details. Please try again.");
      setIsSavingProfile(false);
    }
  };

  // =====================================================
  // 4. REDIRECT
  // =====================================================
  const handleRedirection = (userRole: string) => {
    localStorage.setItem("boox_user_role", userRole);
    localStorage.setItem("boox_session_active", "true");

    if (analytics) {
      logEvent(analytics as any, "login_success" as any, { role: userRole });
    }

    if (userRole === "admin" || userRole === "school_admin") {
      window.location.href = "/admin-dashboard";
    } else {
      window.location.href = "/teacher-dashboard";
    }
  };

  // =====================================================
  // 5. LOADING SCREEN
  // =====================================================
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#f0fff0] flex items-center justify-center selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        <Loader2 className="animate-spin text-[#ffa500] w-8 h-8" />
      </div>
    );
  }

  // =====================================================
  // 6. UI
  // =====================================================
  return (
    <div className="min-h-screen bg-[#f0fff0] flex items-center justify-center p-4 font-sans selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
      
      <div className="bg-white border border-[#ffa500]/20 w-full max-w-md p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgba(255,165,0,0.15)] z-10">

        {/* BRANDING */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            BooxClash <span className="text-[#ffa500]">Pro</span>
          </h1>
          <p className="text-slate-500 text-sm">
            A Product of Booxclash Learn Limited
          </p>

          {!showProfileForm && (
            <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 bg-slate-50 py-2 px-5 rounded-full mx-auto w-fit border border-slate-200">
              <Briefcase size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Teacher Portal
              </span>
            </div>
          )}
        </div>

        {/* 🔄 CONDITIONAL RENDER: LOGIN VS PROFILE COMPLETION */}
        {!showProfileForm ? (
          <div className="space-y-6">
            {referralCode && (
              <div className="bg-[#6c2dc7]/10 border border-[#6c2dc7]/20 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
                <Gift className="text-[#6c2dc7] mt-0.5" size={18} />
                <div>
                  <h4 className="text-slate-900 font-bold text-sm">You were invited!</h4>
                  <p className="text-slate-600 text-xs mt-1">
                    Sign in with Google below to claim your free trial credits.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              type="button"
              className="w-full bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 disabled:opacity-70 transition-all shadow-sm hover:shadow-md"
            >
              {isAuthLoading ? (
                <Loader2 className="animate-spin text-slate-900 w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {isAuthLoading ? "Signing in..." : "Continue with Google"}
            </button>
          </div>

        ) : (
          
          <form onSubmit={handleProfileSubmit} className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <h3 className="text-slate-900 font-bold text-lg">Welcome aboard!</h3>
              <p className="text-slate-600 text-sm mt-1">Please provide a few details to secure your account.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Phone size={14} /> Phone Number
                </label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+260 97 000 0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <MapPin size={14} /> Home / School Address
                </label>
                <textarea 
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all min-h-[100px] resize-none"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSavingProfile}
              className="w-full flex items-center justify-center gap-2 bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold py-4 rounded-xl transition-all disabled:opacity-70 mt-4 active:scale-95 shadow-[0_4px_14px_rgba(255,165,0,0.4)]"
            >
              {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {isSavingProfile ? "Saving Details..." : "Save & Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}