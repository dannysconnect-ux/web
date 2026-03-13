import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, CloudUpload, FileDown, CheckCircle2,
  Plus, Trash2, PlusCircle
} from 'lucide-react'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { db, auth } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 

// --- 🛠️ EDITABLE HELPERS (CSS AUTO-GROW) ---
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
      <div className="invisible whitespace-pre-wrap break-words col-start-1 row-start-1 p-2 text-xs leading-relaxed" aria-hidden="true">
        {localText + '\n'}
      </div>
      <textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        placeholder="- Type here..."
        className="col-start-1 row-start-1 w-full h-full min-h-[60px] p-2 text-xs leading-relaxed text-slate-700 bg-transparent border border-transparent hover:border-slate-300 md:hover:bg-slate-50 focus:border-slate-500 focus:bg-white rounded outline-none resize-none overflow-hidden transition-colors"
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
      <div className="invisible whitespace-pre-wrap break-words col-start-1 row-start-1 p-2 text-xs leading-relaxed" aria-hidden="true">
        {localText + '\n'}
      </div>
      <textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        className={`col-start-1 row-start-1 w-full h-full min-h-[60px] p-2 text-xs leading-relaxed text-slate-700 bg-transparent border border-transparent hover:border-slate-300 md:hover:bg-slate-50 focus:border-slate-500 focus:bg-white rounded outline-none resize-none overflow-hidden transition-colors ${className}`}
      />
    </div>
  );
};

export default function WeeklyView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. ALL HOOKS AT THE TOP
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localPlanData, setLocalPlanData] = useState<any>(null);
  
  const { planData, meta } = location.state || {};

  useEffect(() => {
    if (!planData || !meta) {
      navigate('/teacher-dashboard'); 
    } else {
      setLocalPlanData(planData);
    }
  }, [planData, meta, navigate]);

  const schoolName = meta?.schoolName || meta?.school || "Primary School"; 
  const schoolLogo = meta?.logo_url || meta?.schoolLogo || null;

  // --- 🛠️ DATA HELPERS ---
  const getActivities = (day: any) => {
    const actData = day.activities || day.learning_activity || [];
    if (Array.isArray(actData)) return actData;
    if (typeof actData === "string") return actData.split(/\d+\.\s+/).filter((item: string) => item.trim().length > 0);
    return [];
  };

  const getResources = (day: any) => Array.isArray(day.resources) ? day.resources.join(", ") : (day.resources || "");
  const getContent = (day: any) => day.scope_of_lesson || day.content || day.subtopic || "-";
  const getObjectives = (day: any) => {
    const objs = day.objectives || day.specific_competence || [];
    return Array.isArray(objs) ? objs : [objs];
  };
  const getReferences = (day: any) => day.references || day.reference || "Syllabus";

  // --- ✍️ EDITING HANDLERS ---
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
    newDays.splice(index + 1, 0, { day: "New Day" });
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleAddRowToBottom = () => {
    const newDays = [...(localPlanData.days || []), { day: "New Day" }];
    setLocalPlanData({ ...localPlanData, days: newDays });
  };

  const handleSaveToCloud = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
        await addDoc(collection(db, "generated_weekly_plans"), {
            userId: auth.currentUser.uid,
            ...meta, 
            school: schoolName,
            schoolLogo: schoolLogo, 
            planData: localPlanData, 
            createdAt: serverTimestamp(),
            type: "Weekly Forecast"
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) { alert(`Failed to save: ${err.message}`); } 
    finally { setSaving(false); }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!localPlanData || !meta) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pdfStartDate = meta.startDate ? new Date(meta.startDate) : new Date();
    const pdfEndDate = new Date(pdfStartDate);
    pdfEndDate.setDate(pdfStartDate.getDate() + 4);
    
    const formatPDFDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let yPos = 15; 
    let logoData = "";
    
    const getBase64 = (url: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; img.src = url;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(""); 
        });
    };

    logoData = await getBase64(schoolLogo || COAT_OF_ARMS_URL);
    if (logoData) { doc.addImage(logoData, 'PNG', (pageWidth/2)-10, yPos, 20, 20); yPos += 25; }

    doc.setFont("helvetica", "bold").setFontSize(14).text(schoolName.toUpperCase(), pageWidth/2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(11).text("WEEKLY FORECAST OF WORK", pageWidth/2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(10).text(`Subject: ${meta.subject}`, 14, yPos);
    doc.text(`Grade: ${meta.grade} | Term: ${meta.term} | Week: ${meta.weekNumber}`, pageWidth/2, yPos, { align: "center" });
    doc.text(`Date: ${formatPDFDate(pdfStartDate)} - ${formatPDFDate(pdfEndDate)}`, pageWidth-14, yPos, { align: "right" });
    
    yPos += 5;

    const tableHeaders = [['DAY', 'SUBTOPIC', 'SPECIFIC OUTCOMES', 'CONTENT (SCOPE)', 'ACTIVITIES', 'RESOURCES', 'REFERENCE', 'COMMENT']];
    const tableBody = (localPlanData.days || []).map((day: any) => [
        day.day || "", day.subtopic || "",
        getObjectives(day).map((o: string) => `• ${o}`).join("\n"),
        getContent(day),
        getActivities(day).map((a: string) => `• ${a}`).join("\n"),
        getResources(day), getReferences(day), day.expected_standard || "" 
    ]);

    autoTable(doc, {
        startY: yPos, head: tableHeaders, body: tableBody, theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 35 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 50 }, 5: { cellWidth: 30 }, 6: { cellWidth: 35 }, 7: { cellWidth: 35 } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 25;
    if(finalY > 180) { doc.addPage(); finalY = 30; } 
    doc.line(14, finalY, 80, finalY); doc.text("TEACHER'S SIGNATURE", 14, finalY + 5);
    doc.line(pageWidth - 80, finalY, pageWidth - 14, finalY); doc.text("HEAD TEACHER'S SIGNATURE", pageWidth - 14, finalY + 5, { align: "right" });

    doc.save(`${meta.subject}_Week${meta.weekNumber}.pdf`);
  }, [localPlanData, meta, schoolName, schoolLogo]);

  // 2. EARLY RETURN AFTER ALL HOOKS
  if (!localPlanData) return null;

  const previewStartDate = meta.startDate ? new Date(meta.startDate) : new Date();
  const previewEndDate = new Date(previewStartDate);
  previewEndDate.setDate(previewStartDate.getDate() + 4);
  const formatPreviewDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 overflow-x-hidden">
      <nav className="bg-white border-b px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/teacher-dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
               <h1 className="font-bold text-slate-800 text-lg">Weekly Forecast</h1>
               <p className="text-xs text-slate-500">{meta.subject} • {meta.grade}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveToCloud} disabled={saving || saveSuccess} className="px-4 py-2 bg-white border rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors">
              {saving ? <Loader2 size={16} className="animate-spin"/> : saveSuccess ? <CheckCircle2 size={16} className="text-emerald-600"/> : <CloudUpload size={16}/>}
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
            <button onClick={handleDownloadPDF} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors">
              <FileDown size={16} /> <span>Export PDF</span>
            </button>
          </div>
      </nav>

      <main className="max-w-[98%] mx-auto py-6 px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {['Term', 'Week', 'Subject', 'Dates'].map((label, idx) => (
               <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                  <p className="font-bold text-slate-800">
                    {idx === 0 ? meta.term : idx === 1 ? meta.weekNumber : idx === 2 ? meta.subject : `${formatPreviewDate(previewStartDate)} - ${formatPreviewDate(previewEndDate)}`}
                  </p>
               </div>
            ))}
        </div>

        <div className="bg-white md:shadow-xl rounded-xl overflow-hidden border-none md:border md:border-slate-200 w-full">
            <div className="bg-white p-6 border-b flex flex-col items-center justify-center text-slate-900">
                <img src={schoolLogo || COAT_OF_ARMS_URL} className="h-16 w-16 object-contain mb-2" alt="Logo"/>
                <h2 className="font-black text-lg sm:text-xl uppercase tracking-widest text-center">{schoolName}</h2>
                <h3 className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mt-2">Weekly Forecast of Work</h3>
            </div>

            <div className="w-full max-w-full md:overflow-x-auto pb-6">
                <table className="w-full text-left md:border-collapse min-w-full md:min-w-[1200px] block md:table">
                    <thead className="hidden md:table-header-group bg-slate-900 text-white text-[10px] uppercase font-bold text-center">
                        <tr>
                            <th className="p-3 border-r border-slate-700 w-24">Day / Actions</th>
                            <th className="p-3 border-r border-slate-700">Subtopic</th>
                            <th className="p-3 border-r border-slate-700 w-1/6">Specific Outcomes</th>
                            <th className="p-3 border-r border-slate-700 w-1/6">Content (Scope)</th>
                            <th className="p-3 border-r border-slate-700 w-1/5">Activities</th>
                            <th className="p-3 border-r border-slate-700">Resources</th>
                            <th className="p-3 border-r border-slate-700">Reference</th>
                            <th className="p-3">Comment</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group text-xs text-slate-700">
                        {localPlanData.days?.map((day: any, i: number) => (
                            <tr key={i} className="block md:table-row bg-white border border-slate-200 md:border-none mb-6 md:mb-0 group align-top">
                                <td className="block md:table-cell p-4 md:p-3 border-b md:border-r font-bold md:text-center bg-slate-50 md:bg-transparent">
                                    <div className="flex justify-between items-center md:flex-col md:gap-2">
                                      <EditableTextCell value={day.day || ""} onChange={(v) => handleTextUpdate(i, 'day', v)} className="text-center font-bold" />
                                      <div className="flex gap-2 print:hidden opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleInsertRow(i)} className="p-1.5 bg-white md:bg-transparent border md:border-none text-slate-500 rounded hover:text-indigo-600"><Plus size={16}/></button>
                                          <button onClick={() => handleDeleteRow(i)} className="p-1.5 bg-rose-50 md:bg-transparent border md:border-none text-rose-500 rounded hover:text-rose-700"><Trash2 size={16}/></button>
                                      </div>
                                    </div>
                                </td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableTextCell value={day.subtopic || ""} onChange={(v) => handleTextUpdate(i, 'subtopic', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableArrayCell value={getObjectives(day)} onChange={(v) => handleArrayUpdate(i, 'objectives', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableTextCell value={getContent(day)} onChange={(v) => handleTextUpdate(i, 'content', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableArrayCell value={getActivities(day)} onChange={(v) => handleArrayUpdate(i, 'activities', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableTextCell value={getResources(day)} onChange={(v) => handleTextUpdate(i, 'resources', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableTextCell value={getReferences(day)} onChange={(v) => handleTextUpdate(i, 'references', v)} /></td>
                                <td className="block md:table-cell p-0 border-b md:border-r"><EditableTextCell value={day.expected_standard || ""} onChange={(v) => handleTextUpdate(i, 'expected_standard', v)} /></td>
                            </tr>
                        ))}
                        <tr className="block md:table-row print:hidden">
                            <td colSpan={8} className="p-4 bg-slate-50 text-center">
                               <button onClick={handleAddRowToBottom} className="flex items-center gap-2 px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 mx-auto transition-all"><PlusCircle size={18} /> Add New Row</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-32 bg-slate-50/50 border-t">
                <div className="space-y-4 text-center md:text-left"><div className="h-px bg-slate-300 w-full" /><p className="font-bold text-[10px] uppercase text-slate-500">Teacher's Signature</p></div>
                <div className="space-y-4 text-center md:text-right"><div className="h-px bg-slate-300 w-full" /><p className="font-bold text-[10px] uppercase text-slate-500">Head Teacher's Signature</p></div>
            </div>
        </div>
      </main>
    </div>
  );
}