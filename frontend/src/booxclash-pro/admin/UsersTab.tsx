import React, { useState } from 'react';
import { 
    UserPlus, Trash2, FolderOpen, Loader2, CalendarClock, 
    Wallet, MapPin, MessageCircle, FileText, Clock, Calendar, Download 
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';
import { ReceiptDocument } from '../Receipt';
import { IndividualUser } from '../AdminDashboard';

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-76nr.onrender.com');

// Helper to safely format Firestore Timestamps into readable strings
const safeFormatDate = (dateObj: any) => {
    if (!dateObj) return null;
    if (typeof dateObj === 'string') return dateObj;
    if (typeof dateObj.toDate === 'function') {
        return dateObj.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(dateObj).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function UsersTab({ users, loading, refreshUsers, getHeaders }: any) {
  const [userFilter, setUserFilter] = useState<'all' | 'with_contact'>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userContent, setUserContent] = useState<{schemes: any[], weekly: any[], lessons: any[]}>({ schemes: [], weekly: [], lessons: [] });
  const [loadingUserContent, setLoadingUserContent] = useState(false);
  const [expandedContentCat, setExpandedContentCat] = useState<'scheme' | 'weekly' | 'lesson' | null>(null);

  const displayedUsers = userFilter === 'with_contact' ? users.filter((u: IndividualUser) => u.phoneNumber || u.profileComplete) : users;

  // ✅ NEW: CSV Export Engine
  const exportToCSV = () => {
    const headers = [
        "Name", "Email", "Phone Number", "Address", "School Name", 
        "TPIN", "Current Plan", "Credits Remaining", "Joined Date", "Last Login"
    ];

    const csvRows = [
        headers.join(','), 
        ...displayedUsers.map((user: IndividualUser) => {
            const u = user as any;
            const escapeCSV = (val: any) => `"${(val || '').toString().replace(/"/g, '""')}"`;

            return [
                escapeCSV(user.name),
                escapeCSV(user.email),
                escapeCSV(user.phoneNumber),
                escapeCSV(user.address),
                escapeCSV(user.schoolName || u.school),
                escapeCSV(u.tpin_associated),
                escapeCSV(u.current_plan),
                user.credits,
                escapeCSV(safeFormatDate(u.createdAt)),
                escapeCSV(safeFormatDate(u.lastLogin))
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Booxclash_Users_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExpandUser = async (uid: string) => {
    if (expandedUserId === uid) { setExpandedUserId(null); return; }
    setExpandedUserId(uid); setLoadingUserContent(true); setExpandedContentCat(null);
    try {
        const fetchDocs = async (coll: string) => {
            let q = query(collection(db, coll), where("userId", "==", uid));
            let snap = await getDocs(q);
            if (snap.empty) { q = query(collection(db, coll), where("uid", "==", uid)); snap = await getDocs(q); }
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        };
        const [schemes, weekly, lessons] = await Promise.all([ fetchDocs('generated_schemes'), fetchDocs('generated_weekly_plans'), fetchDocs('generated_lesson_plans') ]);
        setUserContent({ schemes, weekly, lessons });
    } catch (e) { console.error(e); }
    setLoadingUserContent(false);
  };

  const handleUserTopUp = async (uid: string, amount: number) => {
    const targetUser = users.find((u: any) => u.uid === uid);
    if (!confirm(`Confirm Top-up for ${targetUser?.name || 'User'}?`)) return;
    const headers = await getHeaders();
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/users/topup`, { method: "POST", headers, body: JSON.stringify({ target_uid: uid, amount_paid: amount }) });
        const data = await res.json();
        await updateDoc(doc(db, "users", uid), { last_payment_amount: amount, last_payment_date: new Date().toISOString() });
        
        const receiptData = { receipt_no: data.receipt_no, date: data.date, user_name: targetUser?.name, user_uid: uid, plan_name: data.plan_name, amount: data.amount, credits: data.credits };
        const blob = await pdf(<ReceiptDocument data={receiptData} />).toBlob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Receipt_${data.receipt_no}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
        alert("Top-up Successful! Receipt Downloaded.");
        refreshUsers();
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const deleteUser = async (uid: string) => {
    if(!confirm("Delete user?")) return;
    const headers = await getHeaders();
    await fetch(`${API_BASE}/api/v1/admin/users/${uid}`, { method: "DELETE", headers });
    refreshUsers();
  };

  const deleteUserSpecificContent = async (docId: string, type: 'scheme' | 'weekly' | 'lesson') => {
    if(!confirm("Delete this document?")) return;
    const headers = await getHeaders();
    const map: any = { 'scheme': 'generated_schemes', 'weekly': 'generated_weekly_plans', 'lesson': 'generated_lesson_plans' };
    try {
        await fetch(`${API_BASE}/api/v1/admin/content/delete`, { method: "DELETE", headers, body: JSON.stringify({ doc_id: docId, collection_name: map[type] }) });
        setUserContent(prev => {
            const key = type === 'scheme' ? 'schemes' : type === 'weekly' ? 'weekly' : 'lessons';
            return { ...prev, [key]: prev[key].filter((d: any) => d.id !== docId) };
        });
    } catch (e) { alert("Failed to delete document."); }
  };

  return (
    <div className="animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex gap-2">
                <button 
                    onClick={() => setUserFilter('all')} 
                    className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${userFilter === 'all' ? 'bg-[#6c2dc7] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    All Users
                </button>
                <button 
                    onClick={() => setUserFilter('with_contact')} 
                    className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${userFilter === 'with_contact' ? 'bg-[#ffa500] text-slate-900 shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    With Contact Info
                </button>
            </div>
            
            {/* ✅ Export Button */}
            <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-colors shadow-sm"
            >
                <Download size={16} className="text-emerald-600" /> Export to Excel
            </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-sm font-bold uppercase tracking-wider">
                    <tr>
                        <th className="p-5">Teacher Profile</th>
                        <th className="p-5">Plan & Status</th>
                        <th className="p-5">School & Activity</th>
                        <th className="p-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#ffa500]"/></td></tr> : 
                      displayedUsers.map((user: IndividualUser) => {
                        const u = user as any; 

                        return (
                        <React.Fragment key={user.uid}>
                        <tr className="hover:bg-slate-50 transition-colors">
                            {/* COLUMN 1: Teacher Profile */}
                            <td className="p-5 align-top">
                                <div className="flex items-start gap-4">
                                    <div className="bg-[#6c2dc7]/10 p-2.5 rounded-xl text-[#6c2dc7] mt-1 border border-[#6c2dc7]/20"><UserPlus size={20}/></div>
                                    <div>
                                        <p className="font-bold text-slate-900 flex items-center gap-2 text-base">
                                            {user.name}
                                            {u.authProvider === 'google' && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold uppercase">Google</span>}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium mb-2">{user.email}</p>

                                        {/* Contact & KYC Info */}
                                        <div className="space-y-1.5">
                                            {user.phoneNumber && (
                                                <a 
                                                    href={`https://wa.me/${user.phoneNumber.replace('+', '')}`} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="text-[11px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors w-fit bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 font-bold"
                                                >
                                                    <MessageCircle size={12} /> {user.phoneNumber}
                                                </a>
                                            )}
                                            {user.address && (
                                                <p className="text-[11px] text-slate-600 font-medium flex items-start gap-1.5 leading-tight max-w-[200px]">
                                                    <MapPin size={12} className="shrink-0 text-slate-400 mt-0.5" /> <span className="line-clamp-2">{user.address}</span>
                                                </p>
                                            )}
                                            {u.tpin_associated && (
                                                <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                                                    <FileText size={12} className="text-slate-400" /> TPIN: {u.tpin_associated}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* COLUMN 2: Plan & Status */}
                            <td className="p-5 align-top pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-bold text-emerald-600 text-2xl">{user.credits} <span className="text-sm text-emerald-600/70 font-sans">CR</span></span>
                                    
                                    {user.last_payment_amount !== undefined && user.last_payment_amount > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                            Paid K{user.last_payment_amount}
                                        </span>
                                    )}
                                </div>

                                {u.current_plan && (
                                    <div className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded inline-block mb-2">
                                        {u.current_plan}
                                    </div>
                                )}

                                {user.last_payment_date && <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mb-1"><Wallet size={12} className="text-slate-400" /> Paid: {safeFormatDate(user.last_payment_date)}</div>}
                                {user.expiresAt && <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200"><CalendarClock size={12} /> Exp: {safeFormatDate(user.expiresAt)}</div>}
                            </td>

                            {/* COLUMN 3: School & Activity */}
                            <td className="p-5 align-top pt-6">
                                <div className="font-bold text-slate-900 text-sm mb-3">{user.schoolName || u.school || "Individual"}</div>
                                
                                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 inline-block w-full">
                                    {u.lastLogin && (
                                        <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                                            <Clock size={12} className="text-[#6c2dc7]" /> Last Login: {safeFormatDate(u.lastLogin)}
                                        </div>
                                    )}
                                    {u.createdAt && (
                                        <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" /> Joined: {safeFormatDate(u.createdAt)}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* COLUMN 4: Actions */}
                            <td className="p-5 text-right align-top pt-6">
                                <div className="flex justify-end gap-2 flex-wrap max-w-[220px] ml-auto">
                                    <button onClick={() => handleExpandUser(user.uid)} className="px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm"><FolderOpen size={14} /> Docs</button>
                                    <button onClick={() => handleUserTopUp(user.uid, 50)} className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">+K50</button>
                                    <button onClick={() => handleUserTopUp(user.uid, 120)} className="px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-sm">+K120</button>
                                    <button onClick={() => deleteUser(user.uid)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg ml-1 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>

                        {/* Expanded Content Document Viewer */}
                        {expandedUserId === user.uid && (
                            <tr className="bg-slate-50/50 shadow-inner">
                                <td colSpan={4} className="p-6 border-b border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><FolderOpen size={16} className="text-[#6c2dc7]" /> Documents generated by {user.name}</h4>
                                    {loadingUserContent ? <div className="flex items-center gap-2 text-slate-500 font-medium"><Loader2 className="animate-spin text-[#ffa500]" size={18}/> Loading...</div> : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {['lesson', 'scheme', 'weekly'].map((type) => (
                                                <div key={type} onClick={() => setExpandedContentCat(expandedContentCat === type ? null : type as any)} className={`p-4 rounded-xl border cursor-pointer transition-all ${expandedContentCat === type ? 'border-[#6c2dc7] bg-[#6c2dc7]/5 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                                                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">{type}s</div>
                                                    <div className="text-2xl font-bold text-slate-900">{userContent[type === 'lesson' ? 'lessons' : type === 'scheme' ? 'schemes' : 'weekly'].length}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {expandedContentCat && (
                                        <div className="bg-white rounded-xl border border-slate-200 mt-4 overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-sm">
                                            <table className="w-full text-left text-sm border-collapse">
                                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                                                    <tr>
                                                        <th className="p-3">Subject</th>
                                                        <th className="p-3">Grade</th>
                                                        <th className="p-3">Details</th>
                                                        <th className="p-3 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(expandedContentCat === 'lesson' ? userContent.lessons : expandedContentCat === 'scheme' ? userContent.schemes : userContent.weekly).map((doc: any) => (
                                                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-3 text-slate-900 font-bold">{doc.subject || 'Unknown'}</td>
                                                            <td className="p-3 text-emerald-600 font-bold">Gr {doc.grade || '-'}</td>
                                                            <td className="p-3 text-slate-600 font-medium truncate max-w-[200px]">
                                                                {expandedContentCat === 'scheme' ? doc.term : expandedContentCat === 'weekly' ? `Week ${doc.weekNumber || doc.week}` : doc.subtopic || doc.topic || '-'}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <button onClick={() => deleteUserSpecificContent(doc.id, expandedContentCat)} className="text-slate-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(expandedContentCat === 'lesson' ? userContent.lessons : expandedContentCat === 'scheme' ? userContent.schemes : userContent.weekly).length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-6 text-center text-slate-500 font-medium italic">No documents found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}
                        </React.Fragment>
                        );
                      })}
                </tbody>
            </table>
        </div>
    </div>
  );
}