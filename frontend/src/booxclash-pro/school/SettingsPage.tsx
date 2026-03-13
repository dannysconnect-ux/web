import React, { useState, useEffect } from 'react';
import { 
  Save, Image as ImageIcon, Building, Loader2, AlertCircle, CheckCircle, MapPin, Phone 
} from 'lucide-react';
import { useAuth } from './useAuth';

// 🆕 IMPORT FIREBASE & SCHEMA
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { SchoolData } from './schema';

/* ---------------------------------------
   ENV-AWARE BACKEND URL (Kept for Logo Upload)
---------------------------------------- */
const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

interface FileState {
  logo: File | null;
}

interface UrlState {
  logo: string | null;
}

interface Props {
  schoolId: string;
}

export default function SchoolSettings({ schoolId }: Props) {
  useAuth();
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 🆕 Typed securely with Partial<SchoolData>
  const [profile, setProfile] = useState<Partial<SchoolData>>({
    name: '', motto: '', address: '', phone: ''
  });
  
  const [files, setFiles] = useState<FileState>({ logo: null });
  const [urls, setUrls] = useState<UrlState>({ logo: null });

  // --- 1. FETCH SETTINGS DIRECTLY FROM FIRESTORE ---
  useEffect(() => {
    const initSettings = async () => {
      if (!schoolId) {
          setPageLoading(false);
          return;
      }

      try {
        // 🆕 Grab directly from the single source of truth
        const docRef = doc(db, "schools", schoolId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as SchoolData;
          
          setProfile({
            name: data.name || '',
            motto: data.motto || '',
            address: data.address || '',
            phone: data.phone || '',
          });
          
          setUrls({
            logo: data.logoUrl || null,
          });
        }
      } catch (err) {
        console.error("Initialization Error:", err);
        setError("Failed to load school profile.");
      } finally {
        setPageLoading(false);
      }
    };

    initSettings();
  }, [schoolId]);

  // --- 2. IMAGE UPLOAD HELPER ---
  const uploadFile = async (file: File | null) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        return data.url; 
    } catch (err) {
        console.error("Upload Error:", err);
        throw err;
    }
  };

  // --- 3. HANDLE SAVE DIRECTLY TO FIRESTORE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      // Step A: Upload Logo if changed
      let logoUrl = urls.logo;
      if (files.logo) {
        logoUrl = await uploadFile(files.logo);
      }

      // Step B: Update Firestore Document
      // Note: updateDoc only overrides the fields you pass it, so it won't delete 
      // your maxTeachers, credits, or adminId by accident!
      const schoolRef = doc(db, "schools", schoolId);
      
      await updateDoc(schoolRef, {
        name: profile.name,
        motto: profile.motto,
        address: profile.address,
        phone: profile.phone,
        logoUrl: logoUrl
      });

      setSuccess("School settings saved successfully!");
      setFiles({ logo: null }); 
      setUrls(prev => ({ ...prev, logo: logoUrl })); 
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-2" />
      <p>Loading settings...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 italic uppercase tracking-tight">Portal Configuration</h1>
          <p className="text-xs text-indigo-500 font-mono">School Ref: {schoolId}</p>
        </div>
        <button 
          form="settings-form" 
          type="submit" 
          disabled={loading} 
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all font-bold text-sm shadow-xl"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {loading ? 'Processing...' : 'Deploy Changes'}
        </button>
      </div>

      {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex items-center gap-3 animate-in fade-in"><CheckCircle size={18}/> {success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3"><AlertCircle size={18}/> {error}</div>}

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
           <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-500 tracking-widest flex items-center gap-2">
             <Building size={14}/> Identity & Branding
           </div>
           <div className="p-6 grid md:grid-cols-3 gap-8">
              {/* Logo Upload Section */}
              <div className="flex flex-col items-center gap-4">
                 <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {urls.logo ? <img src={urls.logo} className="w-full h-full object-contain p-1" alt="School Logo" /> : <ImageIcon className="text-slate-300" />}
                 </div>
                 <label className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded cursor-pointer hover:bg-indigo-100">
                    Replace Logo
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) {
                        setFiles({ logo: file });
                        setUrls(p => ({...p, logo: URL.createObjectURL(file)}));
                      }
                    }} />
                 </label>
              </div>

              {/* Text Fields Section */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">School Name</label>
                    <input 
                      className="w-full p-2 border rounded mt-1 font-bold" 
                      value={profile.name} // 🆕 Updated to map schema 
                      onChange={e => setProfile({...profile, name: e.target.value})} 
                      placeholder="e.g. Lusaka International"
                    />
                 </div>
                 
                 <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Motto / Slogan</label>
                    <input 
                      className="w-full p-2 border rounded mt-1 italic text-slate-600" 
                      value={profile.motto} 
                      onChange={e => setProfile({...profile, motto: e.target.value})} 
                      placeholder="e.g. Excellence in Education"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <MapPin size={10} /> Physical Address
                    </label>
                    <input 
                      className="w-full p-2 border rounded mt-1 text-sm" 
                      value={profile.address} 
                      onChange={e => setProfile({...profile, address: e.target.value})} 
                      placeholder="e.g. Plot 44, Cairo Rd"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Phone size={10} /> Phone / Contact
                    </label>
                    <input 
                      className="w-full p-2 border rounded mt-1 text-sm" 
                      value={profile.phone} 
                      onChange={e => setProfile({...profile, phone: e.target.value})} 
                      placeholder="e.g. +260 97..."
                    />
                 </div>
              </div>
           </div>
        </div>
      </form>
    </div>
  );
}