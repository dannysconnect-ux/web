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
import { db, auth } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 

import SchemesOfWork, { SchemeRow } from './OldSchemesOfWork';

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://booxclash-pro.onrender.com');

const BRAND_PRIMARY: [number, number, number] = [79, 70, 229]; 
const BRAND_ACCENT = 'bg-indigo-600 hover:bg-indigo-700';

// ✅ DEFAULT LOGO CONSTANT
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg";

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
        image.onerror = () => {
            resolve(''); 
        };
    });
};

// ⚡️ DEFAULT COLUMNS FOR OLD SCHEMES STATE
export interface TableColumn {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'week', label: 'Week' },
  { key: 'date_range', label: 'Date' },
  { key: 'topic_content', label: 'Topic / Content' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'methods', label: 'Methods' },
  { key: 'resources', label: 'Resources' },
  { key: 'references', label: 'References' }
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
  
  const hasFetched = useRef(false);

  // Extract variables from navigation state
  const state = location.state || {};
  const { 
    term, subject, grade, 
    weeks, startDate, schemeData, existingData, isViewMode, schoolLogo,
    isLocked: passedLock, customColumns 
  } = state;

  // ✅ FIX: Robust School Name Fallback
  const displaySchool = state.school || state.schoolName || state.meta?.school || "Global Academy";
  const displayGrade = grade?.toString() || "N/A";

  // ✅ HELPER: Safely extract array from different backend wrappers
  const extractRows = (data: any): SchemeRow[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.scheme_data)) return data.scheme_data;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  useEffect(() => {
    // 1. Navigation Check
    if (!location.state) {
      navigate('/teacher-dashboard');
      return;
    }

    // Preserve existing custom setup if loading saved template
    if (passedLock) setIsLocked(true);
    if (customColumns && Array.isArray(customColumns) && customColumns.length > 0) {
      setColumns(customColumns);
    }

    // 2. Data Check (Immediate Render)
    const passedData = schemeData || existingData;
    const safeRows = extractRows(passedData);

    if (safeRows.length > 0) {
      setGeneratedData(safeRows);
      setLoading(false);
      return; 
    }

    // ✅ CRITICAL FIX: If in "View Mode" but data is empty, stop.
    if (isViewMode) {
        setLoading(false);
        return;
    }

    // 🛑 Prevent Double Fetching
    if (hasFetched.current) {
        setLoading(false); 
        return;
    }
    hasFetched.current = true;

    // 3. Fallback API Fetch
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please sign in to view this curriculum.");
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE}/api/v1/old/generate-scheme`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, 
            'X-User-ID': user.uid               
          },
          body: JSON.stringify({
            schoolName: displaySchool,
            schoolLogo, // Pass logo if available
            term,
            subject,
            grade: displayGrade, 
            weeks: parseInt(weeks || "13"),
            startDate 
          }),
        });

        if (response.status === 402 || response.status === 403) {
          navigate('/upgrade');
          return;
        }

        if (!response.ok) throw new Error("Could not reach the AI Syllabus engine.");

        const result = await response.json();
        const cleanRows = extractRows(result);
        
        if (cleanRows.length === 0) {
           console.warn("Backend returned empty data:", result);
        }

        setGeneratedData(cleanRows);

      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message || "Connection failure.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [location.state, navigate, displaySchool, term, subject, displayGrade, weeks, startDate, isViewMode, schoolLogo, passedLock, customColumns]);

  // =====================================================================
  // 🛡️ THE MOAT BUILDER: SILENT BACKGROUND CAPTURE
  // =====================================================================
  const captureEditsBackground = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const schoolId = localStorage.getItem('schoolId') || "";

      // Fire and forget - silently send edits to backend
      fetch(`${API_BASE}/api/v1/old/capture-teacher-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': user.uid,
          'X-School-ID': schoolId
        },
        body: JSON.stringify({
          uid: user.uid,
          planType: "scheme_of_work_old_format", 
          grade: displayGrade,
          subject: subject,
          term: term,
          weekNumber: 1, 
          schoolId: schoolId || null,
          finalEditedData: {
            rows: generatedData,
            columns: columns,
            isLocked
          }
        })
      }).catch(err => console.warn("Background moat capture failed (non-critical):", err));
      
      console.log("🛡️ [Moat] Background capture initiated.");
    } catch (e) {
      console.warn("Could not capture edits:", e);
    }
  };

  // --- PDF GENERATION (UPDATED FOR DYNAMIC COLUMNS) ---
  const handleDownloadPDF = useCallback(async () => {
    if (!generatedData.length) return;

    // 🛡️ Trigger silent data capture
    captureEditsBackground();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // 1. LOAD LOGO
    const logoUrl = schoolLogo || COAT_OF_ARMS_URL;
    let logoData = "";
    try {
        logoData = await getDataUri(logoUrl);
    } catch (e) {
        console.warn("Could not load logo for PDF", e);
    }

    // --- DRAW HEADER (Page 1 Only) ---
    let yPos = 15;

    // Draw Logo Centered
    if (logoData) {
        doc.addImage(logoData, 'PNG', centerX - 12, yPos, 24, 24); 
        yPos += 30; // Move down
    } else {
        yPos += 5;
    }

    // School Name & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("SCHEME OF WORK", centerX, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(16);
    doc.text(displaySchool.toUpperCase(), centerX, yPos, { align: "center" });
    yPos += 7;

    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`${subject.toUpperCase()} - GRADE ${displayGrade}`, centerX, yPos, { align: "center" });
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${term} • Prepared: ${new Date().toLocaleDateString()}`, centerX, yPos, { align: "center" });
    yPos += 8;

    // Separator Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    // --- ⚡️ DYNAMIC TABLE GENERATION ---
    const tableHeaders = [columns.map(col => col.label)]; 

    const tableBody: string[][] = generatedData.map(row => {
        return columns.map(col => {
            const val = row[col.key];
            
            // Apply markdown cleaning if it's the specific topic_content column
            if (col.key === 'topic_content') {
               return String(val || "").replace(/\*\*/g, "").replace(/- /g, "• ");
            }

            if (Array.isArray(val)) return val.join("\n• ");
            return String(val || "");
        });
    });

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: yPos, // Starts exactly after the header
      theme: 'grid',
      headStyles: { 
        fillColor: BRAND_PRIMARY, 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: 3
      },
      styles: { 
          fontSize: 8, 
          cellPadding: 2, 
          valign: 'top', 
          overflow: 'linebreak',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
      },
      didParseCell: (data) => {
        if (generatedData[data.row.index]?.isSpecialRow) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // --- FOOTER SIGNATURES ---
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    let footerY = finalY + 25;

    if (footerY + 20 > pageHeight) {
       doc.addPage();
       footerY = 40; 
    }

    doc.setDrawColor(15, 23, 42); 
    doc.setLineWidth(0.5);
    doc.line(14, footerY, 100, footerY); 
    doc.line(pageWidth - 100, footerY, pageWidth - 14, footerY); 

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("TEACHER'S SIGNATURE", 14, footerY + 5);
    doc.text("DEPARTMENT HEAD / SUPERVISOR", pageWidth - 14, footerY + 5, { align: "right" });

    doc.save(`${subject}_Scheme_of_Work.pdf`);
  }, [generatedData, displaySchool, subject, displayGrade, term, schoolLogo, columns]);

  const handleSaveToCloud = async () => {
    if (!auth.currentUser || saving) return;
    setSaving(true);
    
    // 🛡️ Trigger silent data capture alongside standard save
    captureEditsBackground();

    try {
      await addDoc(collection(db, "generated_schemes"), {
        userId: auth.currentUser.uid,
        schoolName: displaySchool, 
        schoolLogo, // Save logo URL
        term, subject, grade: displayGrade,
        weeks, startDate, 
        schemeData: generatedData, 
        customColumns: columns, // ⚡️ Save column layout
        isLocked: isLocked,     // 🔒 Save lock state
        createdAt: serverTimestamp(), type: "scheme_old_format"
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans min-w-0">
      {/* 🛠 FIXED: Added flex-wrap, adjusted padding for mobile, and added min-w-0 */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-4 py-3 sm:px-8 sm:py-5 sticky top-0 z-50 flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 print:hidden w-full min-w-0">
        
        {/* LEFT SIDE: Title Block */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <button onClick={() => navigate('/teacher-dashboard')} className="p-2 sm:p-3 hover:bg-slate-100 rounded-xl sm:rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shrink-0">
            <ArrowLeft size={22} className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="h-10 w-[1px] bg-slate-200 hidden md:block shrink-0" />
          <div className="min-w-0">
             {/* 🛠 FIXED: Added truncate to prevent long titles from pushing buttons off screen */}
             <h1 className="font-black text-slate-900 text-base sm:text-lg leading-none truncate">{subject}</h1>
             <p className="text-[10px] sm:text-xs font-bold text-indigo-500 mt-1 flex items-center gap-1 truncate">
                <Layout size={12} className="shrink-0" /> <span className="truncate">GRADE {displayGrade} • {term?.toUpperCase()}</span>
             </p>
          </div>
        </div>

        {/* RIGHT SIDE: Action Buttons */}
        {/* 🛠 FIXED: Added flex-wrap and adjusted gap/padding for smaller screens */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap justify-end">
          
          {/* ⚡️ MANAGE COLUMNS BUTTON */}
          <button 
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-xs sm:text-sm"
          >
            <Settings2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden lg:inline">Edit Columns</span>
          </button>

          {/* 🔒 THE LOCK BUTTON */}
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border ${
              isLocked ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isLocked ? <Lock size={16} className="sm:w-[16px] sm:h-[16px]" /> : <Unlock size={16} className="sm:w-[16px] sm:h-[16px]" />}
            <span className="hidden xl:inline">{isLocked ? "Template Locked" : "Set as Template"}</span>
          </button>

          <button onClick={() => window.print()} className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-50 transition-all">
            <Printer size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>

          <button 
            onClick={handleSaveToCloud} 
            disabled={saving || saveSuccess}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              saveSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" /> : saveSuccess ? <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" /> : <CloudUpload size={16} className="sm:w-[18px] sm:h-[18px]" />}
            <span className="hidden md:inline">{saving ? "Syncing..." : saveSuccess ? "Synced" : "Save to Cloud"}</span>
          </button>

          <button 
            onClick={handleDownloadPDF} 
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-6 sm:py-3 ${BRAND_ACCENT} text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-indigo-200 transition-all active:scale-95`}
          >
            <FileDown size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">EXPORT PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto py-6 sm:py-12 px-3 sm:px-6 print:py-0 print:px-0 print:max-w-full w-full min-w-0">
        <div className="bg-white sm:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-slate-200 sm:border-slate-100 p-1 sm:p-2 print:shadow-none print:border-none w-full min-w-0">
          <SchemesOfWork 
            schoolName={displaySchool}
            termInfo={term}
            subject={subject}
            grade={displayGrade}
            startDate={startDate}
            schoolLogo={schoolLogo}
            data={generatedData} 
            onDataChange={setGeneratedData}
            columns={columns}
            onColumnsChange={setColumns}
          />
        </div>
      </main>

      {/* 🆕 UPGRADED MANAGE COLUMNS MODAL */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings2 size={20} className="text-indigo-600" /> Manage Columns
              </h3>
              <button onClick={() => setIsColumnModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {columns.map((col, index) => (
                <div key={col.key} className="flex items-center gap-2 sm:gap-3 bg-white border border-slate-200 p-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all group w-full min-w-0">
                  
                  {/* UP / DOWN REORDER BUTTONS */}
                  <div className="flex flex-col px-1 shrink-0">
                    <button 
                      onClick={() => {
                        if (index === 0) return;
                        const newCols = [...columns];
                        [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
                        setColumns(newCols);
                      }}
                      disabled={index === 0 || col.key === 'week' || col.key === 'topic_content'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
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
                      disabled={index === columns.length - 1 || col.key === 'week' || col.key === 'topic_content'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors p-0.5"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>

                  <div className="bg-slate-100 text-slate-400 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-mono text-[10px] sm:text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* 🛠 FIXED: Added min-w-0 to prevent long text from breaking the input layout */}
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => {
                      const newCols = [...columns];
                      newCols[index].label = e.target.value;
                      setColumns(newCols);
                    }}
                    className="flex-1 min-w-0 w-full bg-transparent border-none outline-none font-bold text-xs sm:text-sm text-slate-700 placeholder-slate-300"
                    placeholder="Column Name"
                    disabled={col.key === 'week' || col.key === 'topic_content'} 
                  />
                  
                  <div className="flex sm:opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={() => {
                          const newKey = `custom_${Date.now()}`;
                          const newCols = [...columns];
                          newCols.splice(index + 1, 0, { key: newKey, label: "NEW COLUMN" });
                          setColumns(newCols);
                        }}
                        className="p-1.5 sm:p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>

                      {col.key !== 'week' && col.key !== 'topic_content' && (
                        <button 
                          onClick={() => setColumns(columns.filter((_, i) => i !== index))}
                          className="p-1.5 sm:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-3">
              <button 
                onClick={() => {
                  const newKey = `custom_${Date.now()}`;
                  setColumns([...columns, { key: newKey, label: "NEW COLUMN" }]);
                }}
                className="w-full py-2.5 sm:py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all flex justify-center items-center gap-2"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> Add New Column at End
              </button>
              
              <button 
                onClick={() => setIsColumnModalOpen(false)}
                className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
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