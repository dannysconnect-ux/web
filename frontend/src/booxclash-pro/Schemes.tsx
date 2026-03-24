import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Loader2, 
  CloudUpload, CheckCircle2, AlertCircle, FileDown,
  Globe, Layout, Lock, Unlock, Settings2, Plus, Trash2, X,
  ArrowUp, ArrowDown // 🆕 Added arrows for reordering
} from 'lucide-react'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { db, auth } from './firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 

import SchemesOfWork from './SchemesOfWork';

const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg";

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

const BRAND_PRIMARY: [number, number, number] = [79, 70, 229]; 
const BRAND_ACCENT = 'bg-indigo-600 hover:bg-indigo-700';

// Helper to load image for PDF
const getDataUri = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve('');
            }
        };
        image.onerror = () => resolve('');
    });
};

// ⚡️ DEFAULT COLUMNS FOR STATE
export interface TableColumn {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'week', label: 'WK' },
  { key: 'topic', label: 'TOPIC' },
  { key: 'prescribed_competences', label: 'PRESCRIBED COMPETENCE' },
  { key: 'specific_competences', label: 'SPECIFIC COMPETENCE' },
  { key: 'content', label: 'CONTENT' },
  { key: 'learning_activities', label: 'ACTIVITY' },
  { key: 'methods', label: 'METHODS' },
  { key: 'assessment', label: 'ASSESSMENT' },
  { key: 'resources', label: 'RESOURCES' },
  { key: 'references', label: 'REF' }
];

export default function Schemes() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ⚡️ DYNAMIC SPREADSHEET STATE
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [isLocked, setIsLocked] = useState(false); // 🔒 Lock state
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [introInfo, setIntroData] = useState<any>(null);
  const hasFetched = useRef(false);

  const { 
    school, schoolName, schoolLogo, term, subject, grade, 
    weeks, startDate, schemeData, introInfo: passedIntro, existingData, isLocked: passedLock 
  } = location.state || {};

  const displaySchool = school || schoolName || "Global Academy";
  const displayGrade = grade?.toString() || "N/A";

  useEffect(() => {
    if (!location.state) { navigate('/teacher-dashboard'); return; }

    // If loading existing template, preserve its lock state and columns if they exist
    if (passedLock) setIsLocked(true);

    if (schemeData && Array.isArray(schemeData)) {
      setGeneratedData(schemeData);
      setIntroData(passedIntro || {});
      setLoading(false);
      return;
    }

    if (existingData && Array.isArray(existingData)) {
      setGeneratedData(existingData);
      setIntroData(existingData[0]?.intro || {});
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setError("Please sign in to view this curriculum."); setLoading(false); return; }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE}/api/v1/new/generate-scheme`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, 
            'X-User-ID': user.uid               
          },
          body: JSON.stringify({
            schoolName: displaySchool, schoolLogo, term, subject,
            grade: displayGrade, weeks: parseInt(weeks || "13"), startDate 
          }),
        });

        if (response.status === 402 || response.status === 403) { navigate('/upgrade'); return; }
        if (!response.ok) throw new Error("Could not reach the AI Syllabus engine.");

        const result = await response.json();
        if (result.rows) {
            setGeneratedData(result.rows);
            setIntroData(result.intro || {});
        } else {
            setGeneratedData(result);
        }

      } catch (err: any) { setError(err.message || "Connection failure."); } 
      finally { setLoading(false); }
    });

    return () => unsubscribe();
  }, [location.state, navigate, displaySchool, term, subject, displayGrade, weeks, startDate, schemeData, passedIntro, existingData, schoolLogo, passedLock]);

  const captureEditsBackground = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const schoolId = localStorage.getItem('schoolId') || "";

      fetch(`${API_BASE}/api/v1/new/capture-teacher-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`,
          'X-User-ID': user.uid, 'X-School-ID': schoolId
        },
        body: JSON.stringify({
          uid: user.uid, planType: "scheme_of_work", grade: displayGrade, subject: subject, term: term,
          weekNumber: 1, schoolId: schoolId || null,
          finalEditedData: { rows: generatedData, intro: introInfo, columns: columns, isLocked } // Include columns/lock
        })
      }).catch(err => console.warn("Background moat capture failed:", err));
    } catch (e) { console.warn("Could not capture edits:", e); }
  };

  // --- DYNAMIC PDF GENERATION ---
  const handleDownloadPDF = useCallback(async () => {
    if (!generatedData.length) return;
    captureEditsBackground();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const marginX = 14; 
    
    const logoUrl = schoolLogo || COAT_OF_ARMS_URL;
    let logoData = await getDataUri(logoUrl).catch(() => "");

    let yPos = 15; 
    if (logoData) { doc.addImage(logoData, 'PNG', centerX - 12, yPos, 24, 24); yPos += 30; } 
    else { yPos += 5; }

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 41, 59);
    doc.text(displaySchool.toUpperCase(), centerX, yPos, { align: "center" }); yPos += 7;

    doc.setFontSize(12); doc.setTextColor(79, 70, 229);
    doc.text(`${subject.toUpperCase()} - ${displayGrade}`, centerX, yPos, { align: "center" }); yPos += 6;

    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`${term} • SCHEME OF WORK`, centerX, yPos, { align: "center" }); yPos += 10;

    doc.setLineWidth(0.5); doc.setDrawColor(200, 200, 200);
    doc.line(marginX, yPos, pageWidth - marginX, yPos); yPos += 10;

    // --- DYNAMIC INTRO SECTIONS ---
    if (introInfo) {
        const textWidth = pageWidth - (marginX * 2);

        if (introInfo.philosophy) {
            doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
            doc.text("Curriculum Philosophy", marginX, yPos); yPos += 5;
            doc.setFont("helvetica", "normal"); doc.setFontSize(10);
            const splitPhil = doc.splitTextToSize(introInfo.philosophy, textWidth);
            doc.text(splitPhil, marginX, yPos);
            yPos += (splitPhil.length * 5) + 6; 
        }

        if (introInfo.competence_learning) {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(11);
            doc.text("Competence-Based Learning", marginX, yPos); yPos += 5;
            doc.setFont("helvetica", "normal"); doc.setFontSize(10);
            const splitComp = doc.splitTextToSize(introInfo.competence_learning, textWidth);
            doc.text(splitComp, marginX, yPos);
            yPos += (splitComp.length * 5) + 6;
        }

        if (introInfo.goals && Array.isArray(introInfo.goals) && introInfo.goals.length > 0) {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(11);
            doc.text("Curriculum Goals", marginX, yPos); yPos += 6;
            doc.setFont("helvetica", "normal"); doc.setFontSize(10);

            introInfo.goals.forEach((goal: string) => {
                const bullet = "•"; const indent = 5; 
                const splitGoal = doc.splitTextToSize(goal, textWidth - indent);
                
                if (yPos + (splitGoal.length * 5) > pageHeight - 20) { doc.addPage(); yPos = 20; }
                doc.text(bullet, marginX, yPos);
                doc.text(splitGoal, marginX + indent, yPos);
                yPos += (splitGoal.length * 5) + 2; 
            });
            yPos += 5; 
        }
    }
    
    // ⚡️ DYNAMIC TABLE GENERATION
    const tableHeaders = [columns.map(col => col.label)]; 
    
    const tableBody = generatedData.map(row => 
      columns.map(col => {
        const cellValue = row[col.key];
        return Array.isArray(cellValue) ? cellValue.join("\n") : (cellValue || "");
      })
    );

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: BRAND_PRIMARY, fontSize: 7, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      styles: { fontSize: 7, cellPadding: 2, valign: 'top', overflow: 'linebreak', lineColor: [203, 213, 225], lineWidth: 0.1 },
      didParseCell: (data) => {
        if (generatedData[data.row.index]?.isSpecialRow) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    let footerY = finalY + 20;
    if (footerY + 20 > pageHeight) { doc.addPage(); footerY = 40; }

    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.5);
    doc.line(marginX, footerY, marginX + 80, footerY); doc.line(pageWidth - marginX - 80, footerY, pageWidth - marginX, footerY); 
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("TEACHER'S SIGNATURE", marginX, footerY + 5);
    doc.text("HEAD TEACHER'S SIGNATURE", pageWidth - marginX, footerY + 5, { align: "right" });

    doc.save(`${subject}_Scheme_of_Work.pdf`);
  }, [generatedData, introInfo, displaySchool, subject, displayGrade, term, schoolLogo, columns, isLocked]);

  const handleSaveToCloud = async () => {
    if (!auth.currentUser || saving) return;
    setSaving(true);
    captureEditsBackground();

    try {
      await addDoc(collection(db, "generated_schemes"), {
        userId: auth.currentUser.uid,
        schoolName: displaySchool, schoolLogo, term, subject, grade: displayGrade, weeks, startDate, 
        schemeData: generatedData, 
        customColumns: columns, // ⚡️ Save column layout
        isLocked: isLocked,     // 🔒 Save lock state
        introInfo: introInfo,      
        createdAt: serverTimestamp(), type: "scheme"
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) { alert("Save failed."); } 
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Architecting Curriculum</h2>
            <p className="text-indigo-400 flex items-center gap-2 justify-center">
              <Globe size={16} className="animate-pulse" /> Synchronizing Global Standards...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl max-w-md w-full text-center border border-slate-100">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">System Interruption</h2>
          <p className="text-slate-500 mt-2 mb-8">{error}</p>
          <button onClick={() => navigate('/teacher-dashboard')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* 🛠 FIXED: Made nav flex-col on mobile, reduced padding on small screens */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 sticky top-0 z-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        
        {/* Left Section: Back button & Title */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => navigate('/teacher-dashboard')} className="p-2 md:p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shrink-0">
            <ArrowLeft size={22} />
          </button>
          <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />
          <div className="truncate">
             <h1 className="font-black text-slate-900 text-base md:text-lg leading-none truncate">{subject}</h1>
             <p className="text-[10px] md:text-xs font-bold text-indigo-500 mt-1 flex items-center gap-1">
                <Layout size={12} /> GRADE {displayGrade} • {term?.toUpperCase()}
             </p>
          </div>
        </div>
        
        {/* 🛠 FIXED: Added w-full and overflow-x-auto so buttons can be swiped on phones */}
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-xs md:text-sm shrink-0"
          >
            <Settings2 size={18} />
            <span className="hidden sm:inline">Edit Columns</span>
          </button>

          {/* 🔒 THE LOCK BUTTON */}
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all border shrink-0 ${
              isLocked ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span className="hidden sm:inline">{isLocked ? "Template Locked" : "Set as Template"}</span>
          </button>

          <button onClick={() => window.print()} className="p-2 md:p-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shrink-0">
            <Printer size={20} />
          </button>

          <button 
            onClick={handleSaveToCloud} 
            disabled={saving || saveSuccess}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all shrink-0 ${
              saveSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <CloudUpload size={18} />}
            <span className="hidden sm:inline">{saving ? "Syncing..." : saveSuccess ? "Synced" : "Save to Cloud"}</span>
          </button>

          <button 
            onClick={handleDownloadPDF} 
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 ${BRAND_ACCENT} text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 shrink-0`}
          >
            <FileDown size={18} /> <span>EXPORT PDF</span>
          </button>
        </div>
      </nav>

      {/* 🛠 FIXED: Reduced outer padding on mobile, changed overflow-hidden to overflow-x-auto */}
      <main className="max-w-[1400px] mx-auto py-6 md:py-12 px-3 md:px-6">
        <div className="bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-x-auto border border-slate-100 p-2">
          
          <SchemesOfWork 
            schoolName={displaySchool}
            schoolLogo={schoolLogo} 
            termInfo={term}
            subject={subject}
            grade={displayGrade}
            introInfo={introInfo} 
            startDate={startDate}
            data={generatedData}
            onDataChange={setGeneratedData}
            columns={columns}
            onColumnsChange={setColumns}
          />

        </div>
      </main>

      {/* MANAGE COLUMNS MODAL (Unchanged but ensuring it scales) */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings2 size={20} className="text-indigo-600" /> Manage Columns
              </h3>
              <button onClick={() => setIsColumnModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-3">
              {columns.map((col, index) => (
                <div key={col.key} className="flex items-center gap-2 md:gap-3 bg-white border border-slate-200 p-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all group">
                  
                  {/* UP / DOWN REORDER BUTTONS */}
                  <div className="flex flex-col px-1 shrink-0">
                    <button 
                      onClick={() => {
                        if (index === 0) return;
                        const newCols = [...columns];
                        [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
                        setColumns(newCols);
                      }}
                      disabled={index === 0 || col.key === 'week' || col.key === 'topic'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (index === columns.length - 1) return;
                        const newCols = [...columns];
                        [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
                        setColumns(newCols);
                      }}
                      disabled={index === columns.length - 1 || col.key === 'week' || col.key === 'topic'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>

                  <div className="bg-slate-100 text-slate-400 px-2 md:px-3 py-1 md:py-2 rounded-lg font-mono text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => {
                      const newCols = [...columns];
                      newCols[index].label = e.target.value;
                      setColumns(newCols);
                    }}
                    className="flex-1 w-full min-w-0 bg-transparent border-none outline-none font-bold text-xs md:text-sm text-slate-700 placeholder-slate-300"
                    placeholder="Column Name"
                    disabled={col.key === 'week' || col.key === 'topic'} 
                  />
                  
                  <div className="flex shrink-0 md:opacity-50 md:group-hover:opacity-100 transition-opacity">
                      {/* INSERT AFTER BUTTON */}
                      <button 
                        onClick={() => {
                          const newKey = `custom_${Date.now()}`;
                          const newCols = [...columns];
                          newCols.splice(index + 1, 0, { key: newKey, label: "NEW COLUMN" });
                          setColumns(newCols);
                        }}
                        className="p-1 md:p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Plus size={18} />
                      </button>

                      {/* DELETE BUTTON */}
                      {col.key !== 'week' && col.key !== 'topic' && (
                        <button 
                          onClick={() => setColumns(columns.filter((_, i) => i !== index))}
                          className="p-1 md:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 space-y-3">
              <button 
                onClick={() => {
                  const newKey = `custom_${Date.now()}`;
                  setColumns([...columns, { key: newKey, label: "NEW COLUMN" }]);
                }}
                className="w-full py-2 md:py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all flex justify-center items-center gap-2"
              >
                <Plus size={18} /> Add New Column
              </button>
              
              <button 
                onClick={() => setIsColumnModalOpen(false)}
                className="w-full py-2 md:py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}