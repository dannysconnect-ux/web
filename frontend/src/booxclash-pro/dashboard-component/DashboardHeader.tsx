import { Briefcase, Zap, Crown, LogOut, Share2, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  teacherName: string;
  schoolName: string;
  loading: boolean;
  credits: number | null;
  expiresAt?: string | null; 
  uid?: string;
  pendingCount?: number;           // 👈 Added pending count
  onReviewPending?: () => void;    // 👈 Added click handler for the notification
  onLogout: () => void;
  onMakeOwn: () => void;
}

export const DashboardHeader = ({ 
  teacherName, 
  schoolName, 
  loading, 
  credits, 
  expiresAt, 
  uid, 
  pendingCount = 0, 
  onReviewPending,
  onLogout, 
  onMakeOwn 
}: HeaderProps) => {
  const isSchoolContext = !!localStorage.getItem('schoolId');
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const safeUid = uid || "invited"; 
    const referralLink = `https://www.booxclashlearn.com/home-booxclash-pro?ref=${safeUid}`;
    const whatsappLink = `https://chat.whatsapp.com/GK2ahWLvPe3AN7ZkikXzhZ`;
    
    const message = `Hey! I use BooxClash to generate my lesson plans, schemes of work, and weekly records in seconds.\n\nJoin using my link and get free credits: ${referralLink}\n\nYou can also join the official WhatsApp group here: ${whatsappLink}`;

    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString() : null;

  return (
    <header className="flex flex-col md:flex-row md:justify-between items-center mb-12 gap-6">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="w-12 h-12 rounded-xl bg-[#6c2dc7]/10 border border-[#6c2dc7]/20 flex items-center justify-center shadow-sm">
          <Briefcase className="text-[#6c2dc7]" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Dashboard</h1>
          <p className="text-slate-600 text-sm mt-0.5 font-medium">
            Welcome back, {loading ? "..." : <span className="text-[#ffa500] font-bold">{teacherName}</span>}
          </p>
          {schoolName !== "My School" && (
              <p className="text-xs text-slate-500 mt-1 font-medium">{schoolName}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
        
        {/* Unified Credits and Expiry Container */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm">
          <Zap size={16} className={credits && credits > 0 ? "text-[#ffa500]" : "text-slate-400"} />
          
          <span className="text-sm flex items-center whitespace-nowrap">
            <span className="font-mono font-bold text-slate-900 mr-1">{credits ?? "-"}</span>
            <span className="hidden sm:inline mr-2 font-medium">
                {isSchoolContext ? 'School Credits' : 'Credits'}
            </span>
            
            <span className="text-slate-300 mx-1">|</span>
            
            {/* Show Expiry if it exists, otherwise show 'Lifetime' for early adopters */}
            {formattedExpiry ? (
               <span className="text-slate-500 font-medium ml-1">
                 Exp: {formattedExpiry}
               </span>
            ) : (
               <span className="text-[#6c2dc7] font-bold ml-1">
                 Lifetime
               </span>
            )}
          </span>
        </div>

        {/* 🚨 NOTIFICATION BUTTON FOR PENDING EVALUATIONS */}
        {pendingCount > 0 && (
          <button 
            onClick={onReviewPending}
            className="relative p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-sm group"
            title="Pending Evaluations"
          >
            <AlertCircle size={20} className="animate-pulse" />
            <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-md border-2 border-white">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          </button>
        )}

        <button 
          onClick={handleShare} 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white font-bold transition-all shadow-md active:scale-95 text-sm"
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span className="hidden sm:inline">{copied ? "Copied Link!" : "Share & Earn"}</span>
          <span className="sm:hidden">{copied ? "Copied!" : "Share"}</span>
        </button>

        <button 
          onClick={onMakeOwn} 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold transition-all shadow-[0_4px_14px_rgba(255,165,0,0.3)] active:scale-95 text-sm"
        >
          <Crown size={16} />
          <span className="hidden lg:inline">Make Your Own</span>
        </button>

        <button 
          onClick={onLogout} 
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-red-200 hover:text-red-500 transition-all text-slate-500 shadow-sm" 
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};