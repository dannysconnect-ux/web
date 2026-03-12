import React, { useState } from 'react';
import { 
    Building2, Check, XCircle, ChevronDown, 
    ChevronUp, Loader2, GraduationCap, Phone, Users 
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { pdf } from '@react-pdf/renderer';
import { ReceiptDocument } from '../Receipt';
import { School } from '../AdminDashboard';

const API_BASE_URL = import.meta.env?.VITE_API_BASE || (window.location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://booxclash-pro.onrender.com');

export default function SchoolsTab({ schools, loading, refreshSchools, getHeaders }: any) {
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [schoolTeachers, setSchoolTeachers] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSchoolTeachers = async () => {
    const headers = await getHeaders();
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/teachers`, { headers });
        if (res.ok) setSchoolTeachers((await res.json()).data || []);
    } catch (e) { console.error(e); }
  };

  const handleExpandSchool = async (schoolId: string) => {
    if (expandedSchoolId === schoolId) { setExpandedSchoolId(null); return; }
    setExpandedSchoolId(schoolId);
    if (schoolTeachers.length === 0) await fetchSchoolTeachers();
  };

  const handleApproveRequest = async (school: School) => {
    const req = school.pendingRequest;
    if (!req || !confirm(`Approve ${school.schoolName} for K${req.amount}?`)) return;
    setProcessingId(school.id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/schools/topup`, { 
          method: "POST", 
          headers, 
          body: JSON.stringify({ 
              school_id: school.adminId, 
              amount_paid: req.amount, 
              credits_to_add: req.requestedCredits, 
              teachers_to_add: req.requestedTeachers 
          }) 
      });
      const apiResult = await res.json(); 

      // ✅ Approve the school in Firestore and clear the pending request
      await updateDoc(doc(db, "schools", school.id), { 
          maxTeachers: req.requestedTeachers, 
          pendingRequest: deleteField(), 
          isApproved: true, 
          subscriptionStatus: true, 
          credits: (school.credits || 0) + req.requestedCredits 
      });
      
      const receiptData = { 
          receipt_no: apiResult.receipt_no || `REC-${Date.now().toString().slice(-6)}`, 
          date: new Date().toLocaleDateString(), 
          user_name: school.schoolName, 
          user_uid: school.adminId, 
          plan_name: "School Subscription Top-Up", 
          amount: req.amount, 
          credits: req.requestedCredits 
      };
      
      const blob = await pdf(<ReceiptDocument data={receiptData} />).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Receipt_${receiptData.receipt_no}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);

      alert("School Approved Successfully!"); 
      refreshSchools(); 
    } catch (e: any) { 
        alert(`Error: ${e.message}`); 
    } finally { 
        setProcessingId(null); 
    }
  };

  const handleSchoolTopUp = async (schoolId: string, amount: number, credits: number) => {
    if (!confirm(`Confirm Top-up K${amount}?`)) return;
    const headers = await getHeaders();
    await fetch(`${API_BASE_URL}/api/v1/admin/schools/topup`, { 
        method: "POST", headers, body: JSON.stringify({ school_id: schoolId, amount_paid: amount, credits_to_add: credits }) 
    });
    alert("Success!"); refreshSchools();
  };

  const handleRejectRequest = async (schoolId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    await updateDoc(doc(db, "schools", schoolId), { pendingRequest: deleteField() });
    refreshSchools();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-sm font-bold uppercase tracking-wider">
                <tr>
                    <th className="p-5">School Details</th>
                    <th className="p-5">Current Credits</th>
                    <th className="p-5 text-right">Actions / Requests</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-[#ffa500]"/></td></tr> : 
                 schools.map((school: any) => (
                    <React.Fragment key={school.id}>
                    <tr className={`transition-colors ${school.pendingRequest ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                        {/* COLUMN 1: School Details */}
                        <td className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#6c2dc7]/10 p-2.5 rounded-xl text-[#6c2dc7] mt-1 border border-[#6c2dc7]/20">
                                    <Building2 size={20}/>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 flex items-center gap-2 text-base">
                                        {school.schoolName}
                                        {school.pendingRequest && (
                                            <span className="text-[9px] bg-[#ffa500] text-slate-900 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse shadow-sm">
                                                Action Req
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-500 mb-2 font-medium">{school.email}</p>
                                    
                                    <div className="flex gap-2 flex-wrap">
                                        {school.phone && (
                                            <a href={`tel:${school.phone}`} className="text-[10px] text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors font-bold">
                                                <Phone size={10} /> {school.phone}
                                            </a>
                                        )}
                                        <div className="text-[10px] text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 font-bold">
                                            <Users size={10} /> {school.maxTeachers || 0} Slots Allowed
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* COLUMN 2: Credits */}
                        <td className="p-5 align-top pt-6">
                            <div className="font-mono font-bold text-2xl text-emerald-600">{school.credits || 0} <span className="text-sm text-emerald-600/70 font-sans">CR</span></div>
                            <div className={`text-[10px] font-bold uppercase mt-1 flex items-center gap-1 ${school.isApproved ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${school.isApproved ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                {school.isApproved ? 'Active' : 'Inactive'}
                            </div>
                        </td>

                        {/* COLUMN 3: Actions & Pending Tickets */}
                        <td className="p-5 text-right align-top pt-5">
                            {school.pendingRequest ? (
                              <div className="bg-white border border-amber-200 rounded-xl p-3 inline-flex items-center gap-4 shadow-sm text-left">
                                 <div className="pr-4 border-r border-slate-100">
                                    <div className="text-amber-600 text-[10px] font-bold uppercase mb-2 flex items-center gap-1">
                                        <Loader2 size={12} className="animate-spin" /> Pending Top-Up
                                    </div>
                                    <div className="flex gap-4">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Paid</div>
                                            <div className="text-slate-900 font-bold text-lg">K{school.pendingRequest.amount}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Credits</div>
                                            <div className="text-emerald-600 font-bold text-lg">+{school.pendingRequest.requestedCredits}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Teachers</div>
                                            <div className="text-blue-600 font-bold text-lg">+{school.pendingRequest.requestedTeachers}</div>
                                        </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <button onClick={() => handleApproveRequest(school)} disabled={!!processingId} className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white p-2.5 rounded-lg disabled:opacity-50 shadow-sm" title="Approve Request">
                                        <Check size={18} strokeWidth={2.5} />
                                    </button>
                                    <button onClick={() => handleRejectRequest(school.id)} disabled={!!processingId} className="bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-slate-400 p-2.5 rounded-lg disabled:opacity-50 shadow-sm" title="Reject Request">
                                        <XCircle size={18} strokeWidth={2.5} />
                                    </button>
                                 </div>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2 items-center flex-wrap max-w-[250px] ml-auto">
                                  <button onClick={() => handleExpandSchool(school.id)} className="mr-2 text-slate-500 hover:text-[#6c2dc7] transition-colors flex items-center gap-1 text-xs font-bold uppercase">
                                    {expandedSchoolId === school.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Teachers
                                  </button>
                                  <button onClick={() => handleSchoolTopUp(school.adminId, 50, 80)} className="px-3 py-2 bg-white hover:bg-slate-50 transition-colors text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-sm">+80 (K50)</button>
                                  <button onClick={() => handleSchoolTopUp(school.adminId, 120, 300)} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 shadow-sm">+300 (K120)</button>
                              </div>
                            )}
                        </td>
                    </tr>

                    {/* Expandable Teacher List */}
                    {expandedSchoolId === school.id && (
                        <tr className="bg-slate-50/50 shadow-inner">
                            <td colSpan={3} className="p-0">
                                <div className="p-6 border-y border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                        <GraduationCap size={16} className="text-[#6c2dc7]"/> Registered Teachers at {school.schoolName}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {schoolTeachers.filter(t => t.schoolId === school.id).length > 0 ? (
                                            schoolTeachers.filter(t => t.schoolId === school.id).map(t => (
                                                <div key={t.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                                    <div className="w-10 h-10 rounded-full bg-[#6c2dc7]/10 text-[#6c2dc7] flex items-center justify-center font-bold text-sm">
                                                        {t.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-900 text-sm font-bold">{t.name}</div>
                                                        <div className="text-slate-500 text-xs font-mono font-medium">Code: {t.loginCode || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-slate-500 text-sm font-medium p-2 bg-white rounded-lg border border-dashed border-slate-200 w-full text-center">
                                                No teachers have joined this school yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
    </div>
  );
}