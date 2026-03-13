import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Send, Sparkles, CheckCircle2, 
  Loader2, Filter, Mail, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

interface UserData {
  uid: string;
  name: string;
  email: string;
  credits: number;
  joined_at: string;
  whatsapp_invited?: boolean; // ✅ Added field
}

export default function EmailPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Campaign State
  const [messageGoal, setMessageGoal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<'ai' | 'whatsapp'>('ai');

  useEffect(() => {
    fetchUsers();
  }, []);

  const getHeaders = async () => {
    const user = auth.currentUser;
    if (!user) return undefined;
    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-User-ID": user.uid
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    const headers = await getHeaders();
    if (!headers) return;
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/users`, { headers });
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ✅ 1. FILTER FOR WHATSAPP
  const handleSelectWhatsApp = () => {
    // Select users who have NOT been invited yet
    const targets = users.filter(u => !u.whatsapp_invited).map(u => u.uid);
    setSelectedUsers(targets);
    setMode('whatsapp');
    setMessageGoal("WHATSAPP_INVITE"); // Special flag for backend
    if(targets.length === 0) alert("All users have already been invited!");
  };

  // ✅ 2. FILTER FOR LOW CREDITS
  const handleSelectInactive = () => {
    const targets = users.filter(u => u.credits <= 1).map(u => u.uid);
    setSelectedUsers(targets);
    setMode('ai');
    setMessageGoal("We noticed you are low on credits. Top up today!"); 
  };

  const toggleUser = (uid: string) => {
    if (selectedUsers.includes(uid)) {
        setSelectedUsers(prev => prev.filter(id => id !== uid));
    } else {
        setSelectedUsers(prev => [...prev, uid]);
    }
  };

  const handleSendCampaign = async () => {
    if (selectedUsers.length === 0) return alert("Select at least one user.");
    
    const confirmMsg = mode === 'whatsapp' 
        ? `Send WhatsApp Invitation to ${selectedUsers.length} users?`
        : `Generate AI emails for ${selectedUsers.length} users?`;

    if (!confirm(confirmMsg)) return;

    setIsSending(true);
    const headers = await getHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/campaign/start`, {
            method: "POST", headers,
            body: JSON.stringify({
                target_uids: selectedUsers,
                goal: messageGoal
            })
        });
        
        if (res.ok) {
            const result = await res.json();
            alert(`Success! Emails Sent: ${result.sent}`);
            setSelectedUsers([]);
            fetchUsers(); // Refresh to see updated whatsapp status
        } else {
            alert("Failed to start campaign.");
        }
    } catch (e) { console.error(e); }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-900 rounded-full transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Mail className="text-indigo-500" /> Email Campaigns
                </h1>
                <p className="text-sm text-slate-500">Manage user engagement and community invites</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: User List */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[80vh]">
                <div className="p-4 border-b border-slate-800 flex flex-wrap gap-2 items-center bg-slate-950/50">
                    <button onClick={() => setSelectedUsers(users.map(u => u.uid))} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg">All</button>
                    <button onClick={() => setSelectedUsers([])} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg">None</button>
                    
                    <div className="h-6 w-px bg-slate-700 mx-2"></div>

                    {/* FILTER BUTTONS */}
                    <button 
                        onClick={handleSelectWhatsApp} 
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 border rounded-lg transition-colors font-medium ${mode === 'whatsapp' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                    >
                        <MessageCircle size={14} /> WhatsApp Invite (Unsent)
                    </button>

                    <button 
                        onClick={handleSelectInactive} 
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 border rounded-lg transition-colors font-medium ${mode === 'ai' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                    >
                        <Filter size={14} /> Low Credits (≤ 1)
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" /></div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-500 uppercase font-bold sticky top-0 bg-slate-900 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3">User</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Credits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {users.map(user => (
                                    <tr 
                                        key={user.uid} 
                                        onClick={() => toggleUser(user.uid)}
                                        className={`cursor-pointer transition-colors ${selectedUsers.includes(user.uid) ? 'bg-indigo-900/20' : 'hover:bg-slate-800/50'}`}
                                    >
                                        <td className="p-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUsers.includes(user.uid) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                                                {selectedUsers.includes(user.uid) && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-white">{user.name}</div>
                                            <div className="text-slate-500 text-xs">{user.email}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {user.whatsapp_invited ? (
                                                <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-900/50">Invited</span>
                                            ) : (
                                                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Pending</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-mono text-slate-300">
                                            {user.credits}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center font-medium">
                    {selectedUsers.length} users selected
                </div>
            </div>

            {/* RIGHT: Campaign Composer */}
            <div className="flex flex-col gap-6">
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        {mode === 'whatsapp' ? <MessageCircle size={20} className="text-green-400"/> : <Sparkles size={20} />}
                        <h3 className="font-bold uppercase tracking-wider text-sm">
                            {mode === 'whatsapp' ? 'WhatsApp Community Invite' : 'AI Campaign Composer'}
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        {mode === 'whatsapp' ? (
                            <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-lg">
                                <p className="text-sm text-green-200 mb-2 font-bold">Standard Invitation Template</p>
                                <p className="text-xs text-slate-400 italic">
                                    "Hi [Name], Thank you for joining BooxClash! We have a VIP WhatsApp group where we share instant support... Click here to Join: chat.whatsapp.com/..."
                                </p>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Campaign Goal</label>
                                <textarea 
                                    value={messageGoal}
                                    onChange={(e) => setMessageGoal(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-none"
                                    placeholder="E.g., Tell users we have new Grade 7 Science content..."
                                />
                            </div>
                        )}

                        <button 
                            onClick={handleSendCampaign}
                            disabled={isSending || selectedUsers.length === 0}
                            className={`w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95 ${mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'}`}
                        >
                            {isSending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                            {isSending ? "Sending..." : `Send to ${selectedUsers.length} Users`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}