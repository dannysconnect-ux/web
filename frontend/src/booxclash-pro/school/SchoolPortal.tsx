import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase'; 
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 
import { 
  Users, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  School,
  Menu,
  X,
  BookOpen // Imported for the SBA icon
} from 'lucide-react';

// --- SUB-COMPONENTS ---
import TeacherManagement from './TeacherManagement';
import DocumentGenerator from './DocumentGenerator';
import Subscription from './Subscription';
import SettingsPage from './SettingsPage'; 
import SchoolSystemManager from './SBAManager'; // 👈 Imported our new SBA Component

export default function SchoolPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('teachers');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- DATA STATE ---
  const [adminSchoolId, setAdminSchoolId] = useState<string>(""); 
  const [schoolData, setSchoolData] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA LOGIC ---
  useEffect(() => {
    // 1. Use onAuthStateChanged to wait for Auth to initialize reliably
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // No user found, stop loading and optionally redirect
            setLoading(false);
            // navigate('/'); // Uncomment to force redirect to login
            return;
        }

        try {
            // 2. Get the Admin User's Doc to find their School ID
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const fetchedSchoolId = userDoc.data().schoolId;
                
                if (fetchedSchoolId) {
                    setAdminSchoolId(fetchedSchoolId);

                    // 3. Listen to School Data (School Name, Limits)
                    const unsubSchool = onSnapshot(doc(db, "schools", fetchedSchoolId), 
                        (docSnap) => {
                             setSchoolData({ id: docSnap.id, ...docSnap.data() });
                        },
                        (error) => {
                            console.error("School fetch error:", error);
                        }
                    );

                    // 4. Listen to Teachers (Real-time count) -> ✅ NEW SUBCOLLECTION WAY
                    const q = query(collection(db, `schools/${fetchedSchoolId}/teachers`));
                    const unsubTeachers = onSnapshot(q, 
                        (snap) => {
                            setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                            setLoading(false); // ✅ Stop loading once data arrives
                        },
                        (error) => {
                            console.error("Teachers fetch error:", error);
                            setLoading(false); // Stop loading even if error occurs
                        }
                    );

                    // Cleanup database listeners when component unmounts
                    return () => {
                        unsubSchool();
                        unsubTeachers();
                    };
                } else {
                    console.error("User has no schoolId assigned.");
                    setLoading(false);
                }
            } else {
                console.error("User document not found.");
                setLoading(false);
            }
        } catch (e) { 
            console.error("Error fetching portal data:", e); 
            setLoading(false); 
        }
    });

    // Cleanup auth listener on unmount
    return () => unsubscribeAuth();
  }, [navigate]);

  // --- PREPARE PROPS ---
  const maxSeats = schoolData?.maxTeachers || 0; 
  const currentCount = teachers.length;

  // --- MENU CONFIGURATION ---
  const menuItems = [
    { 
      id: 'teachers', 
      label: 'Teachers', 
      icon: Users, 
      component: (
        <TeacherManagement 
          schoolId={adminSchoolId} 
          teachers={teachers}            
          maxTeachers={maxSeats}          
          currentCount={currentCount} 
        />
      )
    },
    { 
      id: 'documents', 
      label: 'Document Generator', 
      icon: FileText, 
      component: <DocumentGenerator /> 
    },
    // 🆕 ADDED SBA COMPONENT TO MENU
    {
      id: 'sba',
      label: 'School-Based Assessments',
      icon: BookOpen,
      component: <SchoolSystemManager schoolId={adminSchoolId} />
    },
    { 
      id: 'subscription', 
      label: 'Subscription', 
      icon: CreditCard, 
      component: <Subscription /> 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      // ✅ Optimization: We pass the ID down so SettingsPage doesn't have to fetch it again
      component: <SettingsPage schoolId={adminSchoolId} /> 
    },
  ];

  // Handle Logout
  const handleLogout = async () => {
    try {
        await auth.signOut();
        navigate('/'); 
    } catch (error) {
        console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
            <div className="animate-pulse flex flex-col items-center">
                <School size={48} className="mb-4 opacity-50"/>
                <p>Loading your school...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      
      {/* --- MOBILE OVERLAY --- */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <School size={20} />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">SchoolPortal</span>
          <button className="ml-auto lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="font-bold text-slate-800">Menu</div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg">
                <Menu size={20} />
            </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto h-full">
                {/* Dynamic Component Rendering */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                    {menuItems.find(item => item.id === activeTab)?.component}
                </div>
            </div>
        </main>
      </div>

    </div>
  );
}