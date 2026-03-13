import { useState, useEffect } from 'react';
import { Shield, Mail } from 'lucide-react'; 
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase'; 

// Import our new sub-components
import AnalyticsTab from './admin/AnalyticsTab';
import UsersTab from './admin/UsersTab';
import SchoolsTab from './admin/SchoolsTab';

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

// Export types so our child components can use them
export interface IndividualUser {
  uid: string; name: string; email: string; credits: number;
  schoolName: string; is_approved: boolean; role?: string;
  phoneNumber?: string; address?: string; profileComplete?: boolean;
  expiresAt?: string | null; last_payment_amount?: number; last_payment_date?: string | null;
  [key: string]: any; 
}

export interface School {
  id: string; adminId: string; schoolName: string; email: string; phone: string;
  isApproved: boolean; credits: number; maxTeachers: number; subscriptionStatus: boolean;
  createdAt: string; pendingRequest?: any;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'schools' | 'users'>('analytics');
  
  // Shared State
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<IndividualUser[]>([]); 
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // --- API UTILS ---
  const getHeaders = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("Auth Error: No currentUser found in Firebase!");
        return undefined;
    }
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-User-ID": user.uid };
  };

  // ✅ FIX: Wait for Firebase Auth to initialize before fetching data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Firebase Auth loaded! Fetching backend data...");
            fetchStats();
            fetchUsers();
            fetchSchools();
        } else {
            console.error("User is logged out. API calls aborted.");
            // navigate('/login'); // Optional: kick them out if not logged in
        }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const fetchStats = async () => {
    const headers = await getHeaders();
    if (!headers) return; 
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/stats`, { headers });
        if (res.ok) {
            setStats(await res.json());
        } else {
            console.error("Backend Error on Stats:", await res.text());
        }
    } catch (e) { 
        console.error("Network Error on Stats:", e); 
    }
  };

  const fetchSchools = async () => {
    setLoadingSchools(true);
    const headers = await getHeaders();
    if (!headers) {
        setLoadingSchools(false);
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/schools`, { headers });
        if (res.ok) {
            const json = await res.json();
            setSchools(json.data || []); 
        } else {
            console.error("Backend Error on Schools:", await res.text());
        }
    } catch (e) { 
        console.error("Network Error on Schools:", e); 
    }
    setLoadingSchools(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const allUsers: IndividualUser[] = [];
      
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedExpiresAt = data.expiresAt ? (typeof data.expiresAt.toDate === 'function' ? data.expiresAt.toDate().toLocaleDateString() : new Date(data.expiresAt).toLocaleDateString()) : null;
        let formattedLastPaymentDate = data.last_payment_date ? (typeof data.last_payment_date.toDate === 'function' ? data.last_payment_date.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date(data.last_payment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })) : null;

        allUsers.push({
          ...data, 
          uid: docSnap.id,
          name: data.name || data.displayName || "Unknown User",
          email: data.email || "No Email",
          credits: data.credits || 0,
          schoolName: data.schoolName || data.school || "Individual",
          is_approved: data.is_approved || data.isApproved || false,
          role: data.role || "teacher",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          profileComplete: data.profileComplete || false,
          expiresAt: formattedExpiresAt,
          last_payment_amount: data.last_payment_amount || 0,
          last_payment_date: formattedLastPaymentDate
        });
      });
      
      allUsers.sort((a, b) => (b.last_payment_amount || 0) - (a.last_payment_amount || 0));
      setUsers(allUsers);
    } catch (e) { 
        console.error("Failed to fetch users from Firestore:", e); 
    }
    setLoadingUsers(false);
  };

  return (
    <div className="min-h-screen bg-[#f0fff0] text-slate-800 font-sans p-6 md:p-8 selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <Shield className="text-[#6c2dc7]" /> Booxclash Command Center
            </h1>
            <div className="flex gap-4 items-center">
                <button 
                  onClick={() => navigate('/admin/emails')} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(108,45,199,0.3)] active:scale-95"
                >
                    <Mail size={18} /> Email Campaigns
                </button>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="text-slate-500 hover:text-slate-900 font-bold transition-colors px-2"
                >
                  Exit
                </button>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`py-2 px-6 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-[#6c2dc7] text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('schools')} 
              className={`py-2 px-6 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'schools' 
                  ? 'bg-[#6c2dc7] text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Schools
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              className={`py-2 px-6 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'users' 
                  ? 'bg-[#6c2dc7] text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Users CRM
            </button>
        </div>

        {/* Render Active Component */}
        {activeTab === 'analytics' && <AnalyticsTab users={users} stats={stats} />}
        {activeTab === 'schools' && <SchoolsTab schools={schools} loading={loadingSchools} refreshSchools={fetchSchools} getHeaders={getHeaders} />}
        {activeTab === 'users' && <UsersTab users={users} loading={loadingUsers} refreshUsers={fetchUsers} getHeaders={getHeaders} />}
    </div>
  );
}