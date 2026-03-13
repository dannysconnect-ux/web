import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, CloudUpload, FileDown, CheckCircle2, 
  Calendar, BookOpen, GraduationCap, Map,
  Lock, Unlock, Settings2, Plus, Trash2, X, ArrowUp, ArrowDown, PlusCircle
} from 'lucide-react'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { db, auth } from './firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

const COLORS = {
  primary: 'bg-slate-900 hover:bg-slate-800',
  accent: 'text-indigo-600',
  success: 'bg-emerald-600',
  border: 'border-slate-200',
  bg: 'bg-[#FFFFFF]'
};

// --- ⚡️ DYNAMIC COLUMNS SETUP ---
export interface TableColumn {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'week_num', label: 'WK' },
  { key: 'topic', label: 'COMPONENT' },
  { key: 'subtopic', label: 'TOPIC / SUBTOPIC' },
  { key: 'specific_competence', label: 'SPECIFIC COMPETENCE' },
  { key: 'scope_of_lesson', label: 'SCOPE OF LESSONS' },
  { key: 'learning_activity', label: 'LEARNING ACTIVITY' },
  { key: 'expected_standard', label: 'EXPECTED STANDARD' },
  { key: 'resources', label: 'T/L RESOURCES' },
  { key: 'strategies', label: 'STRATEGIES' },
  { key: 'reference', label: 'REF' }
];

// --- 🛠️ EDITABLE HELPERS (NOW WITH FLAWLESS CSS AUTO-GROW) ---
const toSafeArray = (item: string | string[] | undefined): string[] => {
  if (!item) return [];
  if (Array.isArray(item)) return item;
  if (item.includes('\n') && !item.includes('**')) { 
      return item.split('\n').filter(s => s.trim().length > 0);
  }
  return [item];
};

const EditableArrayCell = ({ value, onChange }: { value?: string[] | string, onChange: (val: string) => void }) => {
  const safeArray = toSafeArray(value);
  const [localText, setLocalText] = useState(safeArray.join('\n'));

  useEffect(() => {
    setLocalText(toSafeArray(value).join('\n'));
  }, [value]);

  return (
    <div className="grid w-full h-full flex-1">
      {/* 👻 Invisible mirror div: dictates the height of the cell naturally */}
      <div 
        className="invisible whitespace-pre-wrap break-words col-start-1 row-start-1 p-3 text-xs leading-relaxed"
        aria-hidden="true"
      >
        {localText + '\n'}
      </div>
      
      {/* ✍️ Actual Textarea: Stacks perfectly on top of the mirror div */}
      <textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        placeholder="- Type here&#10;- New line for bullet"
        className="col-start-1 row-start-1 w-full h-full min-h-[100px] p-3 text-xs leading-relaxed text-slate-700 bg-transparent border border-transparent hover:border-slate-300 md:hover:bg-slate-50 focus:border-slate-500 focus:bg-white rounded outline-none resize-none overflow-hidden transition-colors print:resize-none print:border-none print:p-0"
      />
    </div>
  );
};

const EditableTextCell = ({ value, onChange, className = "" }: { value?: string, onChange: (val: string) => void, className?: string }) => {
  const [localText, setLocalText] = useState(value || "");

  useEffect(() => {
    setLocalText(value || "");
  }, [value]);

  return (
    <div className="grid w-full h-full flex-1">
      {/* 👻 Invisible mirror div: dictates the height of the cell naturally */}
      <div 
        className="invisible whitespace-pre-wrap break-words col-start-1 row-start-1 p-3 text-xs leading-relaxed"
        aria-hidden="true"
      >
        {localText + '\n'}
      </div>

      {/* ✍️ Actual Textarea: Stacks perfectly on top of the mirror div */}
      <textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        className={`col-start-1 row-start-1 w-full h-full min-h-[100px] p-3 text-xs leading-relaxed text-slate-700 bg-transparent border border-transparent hover:border-slate-300 md:hover:bg-slate-50 focus:border-slate-500 focus:bg-white rounded outline-none resize-none overflow-hidden transition-colors print:resize-none print:border-none print:p-0 ${className}`}
      />
    </div>
  );
};

export default function WeeklyView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const { planData, meta, isLocked: passedLock, customColumns } = location.state || {};

  const [localPlanData, setLocalPlanData] = useState<any>(null);
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [isLocked, setIsLocked] = useState(false); 
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  useEffect(() => {
    if (!planData || !meta) {
      navigate('/teacher-dashboard'); 
    } else {
      if (passedLock) setIsLocked(true);
      if (customColumns && Array.isArray(customColumns) && customColumns.length > 0) {
        setColumns(customColumns);
      }
      setLocalPlanData(planData);
    }
  }, [planData, meta, navigate, passedLock, customColumns]);

  const schoolName = meta?.school || planData?.school || "Primary School";
  const startDate = meta?.startDate ? new Date(meta.startDate) : new Date();
  const formattedStartDate = startDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const getFormattedEndDate = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 4); 
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(""); 
    });
  };

  const captureEditsBackground = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const schoolId = localStorage.getItem('schoolId') || "";

      fetch(`${API_BASE}/api/v1/old/capture-teacher-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`,
          'X-User-ID': user.uid, 'X-School-ID': schoolId
        },
        body: JSON.stringify({
          uid: user.uid, planType: "weekly_forecast", grade: meta?.grade, subject: meta?.subject, term: meta?.term,
          weekNumber: meta?.weekNumber || 1, schoolId: schoolId || null,
          finalEditedData: { ...localPlanData, columns: columns, isLocked }
        })
      }).catch(err => console.warn("Background moat capture failed:", err));
    } catch (e) { console.warn("Could not capture edits:", e); }
  };

  const handleDownloadPDF = useCallback(async () => {
    captureEditsBackground();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let yPos = 10; 
    
    try {
        let logoData = "";
        if (meta?.schoolLogo) logoData = await getBase64ImageFromURL(meta.schoolLogo);
        if (!logoData) logoData = await getBase64ImageFromURL(COAT_OF_ARMS_URL);

        if (logoData) {
            doc.addImage(logoData, 'PNG', (pageWidth / 2) - 10, yPos, 20, 20);
            yPos += 25; 
        }
    } catch (e) { yPos += 10; }

    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); 
    
    if (meta?.schoolLogo) {
        doc.setFontSize(18);
        doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
    } else {
        doc.setFontSize(14); doc.text("REPUBLIC OF ZAMBIA", pageWidth / 2, yPos, { align: "center" }); yPos += 6;
        doc.setFontSize(12); doc.text("MINISTRY OF EDUCATION", pageWidth / 2, yPos, { align: "center" }); yPos += 7;
        doc.setFontSize(16); doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" }); yPos += 8;
    }

    doc.setFontSize(11); doc.setTextColor(100, 100, 100); 
    doc.text("WEEKLY FORECAST OF WORK", pageWidth / 2, yPos, { align: "center" }); yPos += 8;

    doc.setDrawColor(200, 200, 200); doc.line(14, yPos, pageWidth - 14, yPos); yPos += 6;

    doc.setFontSize(10); doc.setTextColor(50, 50, 50);
    doc.text(`Subject: ${meta?.subject}`, 14, yPos);
    doc.text(`Grade: ${meta?.grade}   |   Term: ${meta?.term}`, pageWidth / 2, yPos, { align: "center" });
    doc.text(`Week: ${meta?.weekNumber}   Date: ${formattedStartDate} - ${getFormattedEndDate()}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 5;

    const tableHeaders = [columns.map(col => col.label)];
    const tableBody = (localPlanData?.days || []).map((day: any, index: number) => {
        return columns.map(col => {
            if (col.key === 'week_num' && index === 0) return String(meta?.weekNumber);
            if (col.key === 'week_num') return "";
            
            const val = day[col.key] || day[col.key.replace('topic', 'unit')]; 
            
            if (Array.isArray(val)) return val.map(v => `• ${v}`).join('\n');
            return String(val || "");
        });
    });

    autoTable(doc, {
        startY: yPos + 5,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        // 🚨 UPDATED PDF STYLING HERE FOR STRONGER BORDERS AND LARGER FONT
        headStyles: { 
            fillColor: [30, 41, 59], 
            textColor: [255, 255, 255], 
            lineWidth: 0.15, 
            lineColor: [0, 0, 0], 
            fontSize: 7.5, 
            halign: 'center', 
            valign: 'middle', 
            fontStyle: 'bold' 
        },
        styles: { 
            fontSize: 7.5, 
            cellPadding: 4, 
            valign: 'top', 
            lineWidth: 0.15, 
            lineColor: [0, 0, 0], 
            overflow: 'linebreak', 
            textColor: [0, 0, 0] // Pure black text for sharpness
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 20;
    if (finalY > pageHeight - 30) { doc.addPage(); finalY = 40; }

    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.5);
    doc.line(14, finalY, 80, finalY); doc.setFontSize(10); doc.setTextColor(0, 0, 0); // Black signature text
    doc.text("TEACHER'S SIGNATURE & DATE", 14, finalY + 5);
    doc.line(pageWidth - 80, finalY, pageWidth - 14, finalY);
    doc.text("HEAD TEACHER APPROVAL", pageWidth - 14, finalY + 5, { align: "right" });

    doc.save(`${meta?.subject}_W${meta?.weekNumber}_Forecast.pdf`);
  }, [localPlanData, meta, schoolName, formattedStartDate, columns]);


  if (!localPlanData || !meta) return null; 

  const handleTextUpdate = (dayIndex: number, field: string, value: string) => {
    const newDays = [...localPlanData.days];
    newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleArrayUpdate = (dayIndex: number, field: string, value: string) => {
    const newArray = value.split('\n');
    const newDays = [...localPlanData.days];
    newDays[dayIndex] = { ...newDays[dayIndex], [field]: newArray };
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleDeleteRow = (index: number) => {
    const newDays = localPlanData.days.filter((_: any, i: number) => i !== index);
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleInsertRow = (index: number) => {
    const newDays = [...localPlanData.days];
    newDays.splice(index + 1, 0, { topic: "" });
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleAddRowToBottom = () => {
    const newDays = [...localPlanData.days, { topic: "" }];
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleAddColumn = () => {
    const newKey = `custom_${Date.now()}`;
    setColumns([...columns, { key: newKey, label: "NEW COLUMN" }]);
  };

  const handleSaveToCloud = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    captureEditsBackground();

    try {
        await addDoc(collection(db, "generated_weekly_plans"), {
            userId: auth.currentUser.uid,
            ...meta, 
            school: schoolName,
            planData: localPlanData, 
            customColumns: columns,
            isLocked: isLocked, 
            createdAt: serverTimestamp(),
            type: "Weekly Forecast"
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        alert(`Failed to save: ${errorMessage}`);
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${COLORS.bg} font-sans pb-20 w-full overflow-x-hidden`}>
      <nav className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-[98%] mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center w-full lg:w-auto gap-4">
            <button onClick={() => navigate('/teacher-dashboard')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <div className="flex-1 text-center lg:text-left">
               <h1 className="font-bold text-slate-900 text-base leading-tight">Weekly Forecast</h1>
               <p className="text-xs text-slate-500 font-medium">
                  {meta.subject} • Grade {meta.grade} • Week {meta.weekNumber}
               </p>
            </div>
          </div>

          <div className="flex items-center justify-center flex-wrap w-full lg:w-auto gap-2 sm:gap-3">
            <button onClick={() => setIsColumnModalOpen(true)} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-semibold text-xs sm:text-sm">
              <Settings2 size={16} />
              <span className="hidden sm:inline">Columns</span>
            </button>

            <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all border ${isLocked ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              <span className="hidden sm:inline">{isLocked ? "Template Locked" : "Set Template"}</span>
            </button>

            <button onClick={handleSaveToCloud} disabled={saving || saveSuccess} className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all border ${saveSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <CloudUpload size={16} />}
              <span>{saving ? "Saving..." : saveSuccess ? "Saved" : "Save Plan"}</span>
            </button>

            <button onClick={handleDownloadPDF} className={`flex items-center gap-2 px-4 py-2 sm:px-5 ${COLORS.primary} text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95`}>
              <FileDown size={16} /> <span>EXPORT PDF</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto py-6 sm:py-8 px-2 sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 print:hidden">
            {[
                { label: 'Academic Term', val: meta.term, icon: <GraduationCap size={16}/> },
                { label: 'Current Subject', val: meta.subject, icon: <BookOpen size={16}/> },
                { label: 'Date Range', val: `${formattedStartDate} - ${getFormattedEndDate()}`, icon: <Calendar size={16}/> },
                { label: 'Location', val: schoolName, icon: <Map size={16}/> }
            ].map((item, i) => (
                <div key={i} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">{item.icon}</div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">{item.label}</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{item.val}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-white md:shadow-xl md:shadow-slate-200/50 rounded-xl sm:rounded-2xl overflow-hidden border-none md:border md:border-slate-200 w-full bg-transparent md:bg-white">
            <div className="bg-white p-4 sm:p-6 flex flex-col items-center justify-center text-slate-900 space-y-2 border-b border-slate-200 text-center rounded-xl md:rounded-none shadow-sm md:shadow-none mb-4 md:mb-0">
                {meta.schoolLogo ? (
                    <img src={meta.schoolLogo} alt="School Logo" className="h-16 w-16 sm:h-20 sm:w-20 object-contain mb-2" />
                ) : (
                    <img src={COAT_OF_ARMS_URL} alt="Coat of Arms" className="h-16 w-16 sm:h-20 sm:w-20 object-contain mb-2" />
                )}
                
                {meta.schoolLogo ? (
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">{schoolName}</h2>
                ) : (
                    <div>
                        <h2 className="text-base sm:text-lg font-bold uppercase tracking-widest">Republic of Zambia</h2>
                        <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-600">Ministry of Education</h3>
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest mt-2">{schoolName}</h2>
                    </div>
                )}
                <h3 className="text-[10px] sm:text-xs uppercase font-bold tracking-[0.2em] text-indigo-600 mt-2">Weekly Forecast of Work</h3>
            </div>

            {/* 🛠️ CARD-TO-TABLE RESPONSIVE CSS TRICK APPLIED HERE */}
            <div className="w-full max-w-full md:overflow-x-auto touch-pan-x pb-6 sm:pb-10">
                <table className="w-full text-left md:border-collapse min-w-full md:min-w-[1600px] block md:table">
                    <thead className="hidden md:table-header-group bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest text-center">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={`p-3 border-r border-slate-700 ${col.key === 'week_num' ? 'w-12' : 'w-48'}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    
                    <tbody className="block md:table-row-group text-xs text-slate-600">
                        {localPlanData.days?.map((day: any, index: number) => (
                            <tr key={index} className="block md:table-row bg-white border border-slate-200 md:border-none rounded-2xl md:rounded-none shadow-md md:shadow-none mb-6 md:mb-0 md:hover:bg-slate-50/50 transition-colors align-top overflow-hidden group">
                                
                                {/* 📱 MOBILE-ONLY CARD HEADER */}
                                <div className="md:hidden flex justify-between items-center p-3 bg-slate-50 border-b border-slate-100">
                                    <span className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Row {index + 1}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleInsertRow(index)} className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md shadow-sm" title="Insert Below"><Plus size={14}/></button>
                                        <button onClick={() => handleDeleteRow(index)} className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-md shadow-sm" title="Delete Row"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                {columns.map((col) => {
                                    if (col.key === 'week_num') {
                                        return (
                                            <td key={col.key} className="hidden md:table-cell p-3 border-r border-slate-100 text-center font-bold text-slate-800 relative">
                                                {index === 0 ? meta.weekNumber : ""}
                                                <div className="flex flex-col sm:flex-row justify-center gap-2 mt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity print:hidden">
                                                    <button onClick={() => handleInsertRow(index)} className="p-1 text-slate-500 hover:bg-slate-200 rounded" title="Insert Row Below"><Plus size={14} /></button>
                                                    <button onClick={() => handleDeleteRow(index)} className="p-1 text-rose-500 hover:bg-rose-100 rounded" title="Delete Row"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        )
                                    }

                                    const isText = ['topic', 'subtopic', 'specific_competence', 'scope_of_lesson', 'expected_standard'].includes(col.key);
                                    
                                    return (
                                        <td key={col.key} className="block md:table-cell p-4 md:p-0 border-b border-slate-100 md:border-b-0 md:border-r last:border-b-0 md:h-full align-top">
                                            {/* 📱 MOBILE-ONLY COLUMN LABEL */}
                                            <div className="md:hidden text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider">
                                                {col.label}
                                            </div>
                                            
                                            {/* Wrapper div uses Flex so it matches the row's tallest element */}
                                            <div className="flex flex-col h-full bg-slate-50 border border-slate-100 md:border-none md:bg-transparent rounded-lg md:rounded-none overflow-hidden">
                                                {isText ? (
                                                    <EditableTextCell value={day[col.key] || (col.key === 'topic' ? day.unit : "")} onChange={(val) => handleTextUpdate(index, col.key, val)} />
                                                ) : (
                                                    <EditableArrayCell value={day[col.key]} onChange={(val) => handleArrayUpdate(index, col.key, val)} />
                                                )}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}

                        <tr className="block md:table-row print:hidden">
                            <td colSpan={columns.length} className="block md:table-cell p-0 md:p-4 bg-transparent md:bg-slate-50 text-center">
                               <button onClick={handleAddRowToBottom} className="w-full md:w-auto flex justify-center items-center gap-2 px-6 py-4 md:py-2 bg-indigo-50 md:bg-slate-200 text-indigo-700 md:text-slate-700 font-bold rounded-xl md:rounded-lg border-2 border-dashed border-indigo-200 md:border-none md:hover:bg-slate-300 transition-colors">
                                 <PlusCircle size={18} /> Add New Row
                               </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-32 bg-slate-50/50 md:border-t border-slate-100 print:break-inside-avoid rounded-xl md:rounded-none shadow-sm md:shadow-none bg-white md:bg-slate-50/50 border border-slate-200 md:border-none">
                <div className="space-y-4">
                    <div className="h-px bg-slate-300 w-full" />
                    <p className="font-bold text-[10px] uppercase text-slate-500 tracking-tighter">Teacher's Signature & Date</p>
                </div>
                <div className="space-y-4 text-left md:text-right">
                    <div className="h-px bg-slate-300 w-full" />
                    <p className="font-bold text-[10px] uppercase text-slate-500 tracking-tighter">Head Teacher Approval</p>
                </div>
            </div>
        </div>
      </main>

      {/* 🆕 MANAGE COLUMNS MODAL */}
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
                <div key={col.key} className="flex items-center gap-2 sm:gap-3 bg-white border border-slate-200 p-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all group">
                  
                  <div className="flex flex-col px-1">
                    <button 
                      onClick={() => {
                        if (index === 0) return;
                        const newCols = [...columns];
                        [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
                        setColumns(newCols);
                      }}
                      disabled={index === 0 || col.key === 'week_num'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 transition-colors p-1"
                    ><ArrowUp size={14} /></button>
                    <button 
                      onClick={() => {
                        if (index === columns.length - 1) return;
                        const newCols = [...columns];
                        [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
                        setColumns(newCols);
                      }}
                      disabled={index === columns.length - 1 || col.key === 'week_num'}
                      className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 transition-colors p-1"
                    ><ArrowDown size={14} /></button>
                  </div>

                  <div className="hidden sm:block bg-slate-100 text-slate-400 px-3 py-2 rounded-lg font-mono text-xs font-bold">{index + 1}</div>
                  
                  <input 
                    type="text"
                    value={col.label}
                    onChange={(e) => {
                      const newCols = [...columns];
                      newCols[index].label = e.target.value;
                      setColumns(newCols);
                    }}
                    className="flex-1 bg-transparent border-none outline-none font-bold text-xs sm:text-sm text-slate-700 w-full"
                    disabled={col.key === 'week_num'} 
                  />
                  
                  <div className="flex opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          const newCols = [...columns];
                          newCols.splice(index + 1, 0, { key: `custom_${Date.now()}`, label: "NEW COLUMN" });
                          setColumns(newCols);
                        }}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      ><Plus size={16} /></button>

                      {col.key !== 'week_num' && (
                        <button 
                          onClick={() => setColumns(columns.filter((_, i) => i !== index))}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        ><Trash2 size={16} /></button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-3">
              <button onClick={handleAddColumn} className="w-full py-2 sm:py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all flex justify-center items-center gap-2">
                <Plus size={18} /> Add New Column
              </button>
              <button onClick={() => setIsColumnModalOpen(false)} className="w-full py-2 sm:py-3 bg-indigo-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}