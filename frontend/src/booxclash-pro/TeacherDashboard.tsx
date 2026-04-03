import { useState, useEffect } from 'react';
import { 
  Loader2, AlertCircle, X, ChevronRight, CheckCircle2, 
  ShieldAlert, BookOpen, Brain, Lock, Edit3, Sparkles
} from 'lucide-react';
import GenerationModal from './Modals';

// Components
import { DashboardHeader } from './dashboard-component/DashboardHeader';
import { ToolsGrid } from './dashboard-component/ToolsGrid';
import { RecentGenerations } from './dashboard-component/RecentGenerations';
import PendingEvaluationsBanner from './PendingEvaluationsBanner';
// Hook
import { useTeacherDashboard } from './dashboard-component/useTeacherLogic';

// Firebase imports
import { auth, db } from './firebase'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ==============================================================================
// ⏱️ HELPER: CHECK IF LESSON IS IN THE PAST
// ==============================================================================
export const isLessonInPast = (doc: any) => {
  const isLesson = doc.type === 'lesson' || doc.type === 'Lesson Plan' || doc.type === 'Remedial Lesson Plan';
  if (!isLesson) return false;

  if (doc.isEvaluated === true || 
      doc.evaluation_status === 'success' || 
      doc.evaluation_status === 'needs_remedial' || 
      doc.evaluation_status === 'failed') {
      return false;
  }

  const dateStr = doc.planData?.date || doc.lessonData?.date || doc.date;
  if (!dateStr) return false;

  let timeEnd = "23:59"; 
  const timeStr = doc.planData?.time || doc.lessonData?.time || doc.time || "";
  
  if (timeStr && timeStr.includes('-')) {
      timeEnd = timeStr.split('-')[1].trim(); 
  } else if (doc.planData?.timeEnd) {
      timeEnd = doc.planData.timeEnd;
  } else if (doc.lessonData?.timeEnd) {
      timeEnd = doc.lessonData.timeEnd;
  }

  try {
      const cleanDate = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
      const cleanTimeMatch = timeEnd.match(/\d{2}:\d{2}/);
      const cleanTime = cleanTimeMatch ? cleanTimeMatch[0] : "23:59";
      
      const lessonDateTime = new Date(`${cleanDate}T${cleanTime}:00`);
      const now = new Date();

      return now > lessonDateTime; 
  } catch (e) {
      return false; 
  }
};

// ==============================================================================
// 🤖 AI BEST PRACTICES MODAL
// ==============================================================================
function BestPracticesModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenAIBestPractices');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenAIBestPractices', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#ffa500]/20 rounded-3xl shadow-[0_8px_30px_rgba(255,165,0,0.15)] w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-[#ffa500]" />
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">Best Practices for Using AI</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <BookOpen className="text-[#6c2dc7] shrink-0 mt-0.5" size={20} />
            <div>
              <strong className="text-slate-900 block mb-1 text-sm font-bold">Check for Bias & Accuracy</strong>
              <p className="text-sm leading-relaxed text-slate-600">AI isn't perfect. It might produce biased or incorrect information. Always review before sharing with students.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Edit3 className="text-[#6c2dc7] shrink-0 mt-0.5" size={20} />
            <div>
              <strong className="text-slate-900 block mb-1 text-sm font-bold">Use the 80/20 Rule</strong>
              <p className="text-sm leading-relaxed text-slate-600">Let AI handle the initial 80% as your draft, then add your final touch as the last 20%.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Brain className="text-[#6c2dc7] shrink-0 mt-0.5" size={20} />
            <div>
              <strong className="text-slate-900 block mb-1 text-sm font-bold">Trust Your Judgment</strong>
              <p className="text-sm leading-relaxed text-slate-600">Use AI as a starting point, and not the final solution. Always adhere to your school's guidelines.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Lock className="text-[#6c2dc7] shrink-0 mt-0.5" size={20} />
            <div>
              <strong className="text-slate-900 block mb-1 text-sm font-bold">Protect Student Privacy</strong>
              <p className="text-sm leading-relaxed text-slate-600">Never include student names or personal information in your prompts.</p>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <button onClick={handleClose} className="w-full bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(255,165,0,0.3)] active:scale-95 flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 🆕 PROFILE COMPLETION BANNER & MODAL
// ==============================================================================
function ProfileCompletionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkProfileStatus = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().profileComplete !== true) {
          setShowBanner(true);
        }
      } catch (error) {}
    };
    checkProfileStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { phoneNumber: phone, address: address, profileComplete: true, updatedAt: new Date() }, { merge: true });
      setShowModal(false);
      setShowBanner(false);
    } catch (error) {} 
    finally { setSaving(false); }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="bg-[#6c2dc7]/10 border border-[#6c2dc7]/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#6c2dc7]/20 rounded-full shrink-0"><AlertCircle size={20} className="text-[#6c2dc7]" /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Complete Your Profile</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Please add your phone number and address to fully secure your account.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-1 px-5 py-2.5 bg-[#6c2dc7] text-white text-sm font-bold rounded-xl hover:bg-[#6c2dc7]/90 transition-colors shadow-md shrink-0">
          Complete Now <ChevronRight size={16} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#ffa500]/20 rounded-3xl shadow-[0_8px_30px_rgba(255,165,0,0.15)] w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-transparent">
              <h3 className="font-bold text-slate-900 text-lg tracking-tight">Account Details</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+260 97 000 0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">School / Home Address</label>
                <textarea required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your address..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ffa500] focus:ring-1 focus:ring-[#ffa500] transition-all min-h-[100px] resize-none" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold py-4 rounded-xl transition-all disabled:opacity-70 active:scale-95 shadow-[0_4px_14px_rgba(255,165,0,0.3)]">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {saving ? "Saving Details..." : "Save & Complete Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ==============================================================================
// 🏫 MAIN DASHBOARD COMPONENT
// ==============================================================================
export default function TeacherDashboard() {
  const { 
    teacherName, schoolName, loading, credits, expiresAt,
    recentDocs, loadingRecents, isGenerating,
    activeModal, setActiveModal, 
    activeFilter, setActiveFilter,
    hasSchoolId, 
    handleGenerate, handleOpenRecent, handleLogout, navigate 
  } = useTeacherDashboard();

  const currentUid = auth.currentUser?.uid;

  const handleNavigateToSBA = () => {
    navigate('/teacher-sba', { state: { schoolId: localStorage.getItem('schoolId'), teacherId: localStorage.getItem('teacherDocId') } });
  };

  // When clicking the notification bell, filter to lessons and scroll down
  const handleForceReview = () => {
    setActiveFilter('lesson');
    setTimeout(() => {
        document.getElementById('recent-generations-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadingTitle = activeModal === 'catchup' ? "Designing Catch-Up Plan..." : "Give Me a Minute am Planning...";
  const loadingDesc = activeModal === 'catchup' 
    ? "Generating foundational literacy & numeracy (TaRL) activities." 
    : "Please wait while we craft your document.";

  const pendingLessons = recentDocs.filter(isLessonInPast);
  const pendingCount = pendingLessons.length;

  return (
    <div className="min-h-screen bg-[#f0fff0] text-slate-800 font-sans p-6 md:p-8 relative selection:bg-[#6c2dc7]/20 selection:text-[#6c2dc7]">
      <BestPracticesModal />

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-[130] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            {activeModal === 'catchup' ? (
              <Sparkles size={48} className="text-[#6c2dc7] animate-pulse mb-4" />
            ) : (
              <Loader2 size={48} className="text-[#ffa500] animate-spin mb-4" />
            )}
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{loadingTitle}</h2>
            <p className="text-slate-600 mt-2 text-base">{loadingDesc}</p>
        </div>
      )}

      <GenerationModal isOpen={!!activeModal} type={activeModal} onClose={() => setActiveModal(null)} onGenerate={handleGenerate} />

      {/* Header Section (Includes the Bell Icon) */}
      <DashboardHeader 
        teacherName={teacherName} 
        schoolName={schoolName} 
        loading={loading} 
        credits={credits}
        expiresAt={expiresAt} 
        uid={currentUid} 
        pendingCount={pendingCount} 
        onReviewPending={handleForceReview}
        onLogout={handleLogout} 
        onMakeOwn={() => navigate('/make-your-own')}
      />

      <div className="max-w-[1600px] mx-auto mt-8">
        <ProfileCompletionBanner />
        <PendingEvaluationsBanner />
          
        <ToolsGrid onOpenModal={setActiveModal} hasSchoolId={hasSchoolId} onNavigateSBA={handleNavigateToSBA} />

        <div id="recent-generations-section">
          <RecentGenerations 
            docs={recentDocs} loading={loadingRecents} filter={activeFilter}
            setFilter={(f: string) => setActiveFilter(f as typeof activeFilter)} onOpen={handleOpenRecent}
          />
        </div>
      </div>
    </div>
  );
}