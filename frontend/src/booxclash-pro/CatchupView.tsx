import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CloudUpload, Printer, Loader2,
  Lock, Unlock, Settings2, Plus, Trash2, X, ArrowUp, ArrowDown, PlusCircle
} from 'lucide-react'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, auth } from './firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

// ✅ IMPORT DEFAULT COAT OF ARMS
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 

// =====================================================================
// ⚡️ DYNAMIC COLUMNS SETUP
// =====================================================================
export interface TableColumn {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'stage', label: 'STAGE' },
  { key: 'teacherActivity', label: 'TEACHER ACTIVITIES' },
  { key: 'learnerActivity', label: 'LEARNER ACTIVITY' },
  { key: 'method', label: 'METHOD / POINTS' }
];

export default function CatchupView() {
  const location = useLocation();
  const navigate = useNavigate();
  const componentRef = useRef<HTMLDivElement>(null);

  const initialData = location.state?.planData || location.state?.catchupData;
  const initialMeta = location.state?.meta || {};
  const isPreviouslyLocked = location.state?.isLocked !== undefined ? location.state.isLocked : true;

  const [editedData, setEditedData] = useState<any>(null);
  const [meta, setMeta] = useState<any>(initialMeta);
  
  const [isLocked, setIsLocked] = useState(isPreviouslyLocked);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [columns, setColumns] = useState<TableColumn[]>(() => {
    return location.state?.customColumns || DEFAULT_COLUMNS;
  });
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  useEffect(() => {
    if (!initialData) {
      navigate('/');
      return;
    }
    setEditedData(JSON.parse(JSON.stringify(initialData))); 
  }, [initialData, navigate]);

  if (!editedData) return null;

  // =====================================================================
  // COLUMN MANAGEMENT LOGIC
  // =====================================================================
  const handleAddColumn = () => {
    const newKey = `col_${Date.now()}`;
    setColumns([...columns, { key: newKey, label: 'NEW COLUMN' }]);
    const updatedRows = editedData.steps.map((row: any) => ({ ...row, [newKey]: "" }));
    setEditedData({ ...editedData, steps: updatedRows });
  };

  const handleColumnLabelChange = (index: number, newLabel: string) => {
    const newCols = [...columns];
    newCols[index].label = newLabel;
    setColumns(newCols);
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newCols = [...columns];
      [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
      setColumns(newCols);
    } else if (direction === 'down' && index < columns.length - 1) {
      const newCols = [...columns];
      [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
      setColumns(newCols);
    }
  };

  // =====================================================================
  // EDITING HANDLERS
  // =====================================================================
  const handleCellEdit = (rowIndex: number, columnKey: string, newValue: string) => {
    const updatedSteps = [...editedData.steps];
    updatedSteps[rowIndex] = { ...updatedSteps[rowIndex], [columnKey]: newValue };
    setEditedData({ ...editedData, steps: updatedSteps });
  };

  const handleMetaEdit = (field: string, newValue: string) => {
    setEditedData({ ...editedData, [field]: newValue });
  };

  const handleHeaderEdit = (field: string, newValue: string) => {
    setMeta({ ...meta, [field]: newValue });
    setEditedData({ ...editedData, [field]: newValue });
  };

  const handleEnrolmentEdit = (field: string, newValue: string) => {
    const num = parseInt(newValue) || 0;
    setEditedData({ 
        ...editedData, 
        enrolment: { ...editedData.enrolment, [field]: num } 
    });
  };

  const addRow = (index: number) => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {});
    const updatedSteps = [...editedData.steps];
    updatedSteps.splice(index + 1, 0, newRow);
    setEditedData({ ...editedData, steps: updatedSteps });
  };

  const removeRow = (index: number) => {
    if (editedData.steps.length > 1) {
      const updatedSteps = editedData.steps.filter((_: any, i: number) => i !== index);
      setEditedData({ ...editedData, steps: updatedSteps });
    }
  };

  // =====================================================================
  // CLOUD SAVE HANDLER
  // =====================================================================
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) { alert("Please login to save."); return; }
      
      const payload = {
        userId: user.uid,
        schoolId: localStorage.getItem('schoolId') || null,
        planType: "catchup",
        originalData: initialData,
        finalEditedData: {
           ...editedData,
           columns: columns,
           isLocked: isLocked 
        },
        capturedAt: serverTimestamp(),
        grade: meta.grade || editedData.grade,
        subject: meta.subject || editedData.subject,
        term: meta.term || editedData.term,
      };

      await addDoc(collection(db, "ai_training_flywheel"), payload);
      alert("✅ Catch-Up Plan Saved Successfully!");
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================================
  // EXACT ZAMBIAN FORMAT PDF EXPORT (BIG TO SMALL, NO SPACES)
  // =====================================================================
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const centerX = pageWidth / 2;
      doc.setTextColor(0, 0, 0);
      const getSafePngBase64 = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
          if (!url) { resolve(null); return; }
          const img = new Image();
          img.crossOrigin = 'Anonymous'; 
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 100;
            canvas.height = img.height || 100;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(null);
            }
          };
          img.onerror = () => { resolve(null); };
          img.src = url;
        });
      };

      const [coatOfArmsB64, logoB64] = await Promise.all([
        getSafePngBase64(COAT_OF_ARMS_URL),
        getSafePngBase64(editedData.logo_url)
      ]);

      let currentY = margin;

      // 1. CENTER LOGOS
      if (coatOfArmsB64 && !logoB64) {
          doc.addImage(coatOfArmsB64, 'PNG', centerX - 12, currentY, 24, 24);
      } else if (coatOfArmsB64 && logoB64) {
          doc.addImage(coatOfArmsB64, 'PNG', centerX - 26, currentY, 24, 24);
          doc.addImage(logoB64, 'PNG', centerX + 2, currentY, 24, 24);
      } else if (logoB64) {
          doc.addImage(logoB64, 'PNG', centerX - 12, currentY, 24, 24);
      }
      
      currentY += 36;

      // 2. CENTER HEADINGS (BIG TO SMALL, TIGHT SPACING)
      doc.setFont("helvetica", "bold");
      
      doc.setFontSize(18);
      doc.text("REPUBLIC OF ZAMBIA", centerX, currentY, { align: "center" });
      
      currentY += 6.5;
      doc.setFontSize(15);
      doc.text("MINISTRY OF EDUCATION", centerX, currentY, { align: "center" });
      
      currentY += 5.5;
      doc.setFontSize(12);
      doc.text((editedData.schoolName || meta.school || "PRIMARY SCHOOL").toUpperCase(), centerX, currentY, { align: "center" });
      
      currentY += 5;
      doc.setFontSize(10);
      doc.text(`${(meta.subject || editedData.subject || "CATCH-UP").toUpperCase()} LESSON PLAN`, centerX, currentY, { align: "center" });

      currentY += 10; // Small breath before details grid

      // 3. TWO-COLUMN DETAILS
      doc.setFontSize(11);
      const leftX = margin;
      let detailsY = currentY;

      // LEFT SIDE
      doc.setFont("helvetica", "bold"); doc.text("Teacher:", leftX, detailsY);
      doc.setFont("helvetica", "normal"); doc.text(editedData.teacherName || "________", leftX + 20, detailsY);
      
      doc.setFont("helvetica", "bold"); doc.text("Grade:", leftX, detailsY + 6);
      doc.setFont("helvetica", "normal"); doc.text(meta.grade || editedData.grade || "________", leftX + 20, detailsY + 6);
      
      doc.setFont("helvetica", "bold"); doc.text("Subject:", leftX, detailsY + 12);
      doc.setFont("helvetica", "normal"); doc.text(meta.subject || editedData.subject || "________", leftX + 20, detailsY + 12);
      
      doc.setFont("helvetica", "bold"); doc.text("Topic:", leftX, detailsY + 18);
      doc.setFont("helvetica", "normal"); doc.text(editedData.topic || "________", leftX + 20, detailsY + 18);

      // RIGHT SIDE
      const rightX = pageWidth - 90;
      doc.setFont("helvetica", "bold"); doc.text("Time:", rightX, detailsY);
      doc.setFont("helvetica", "normal"); doc.text(editedData.time || "________", rightX + 22, detailsY);
      
      doc.setFont("helvetica", "bold"); doc.text("Duration:", rightX, detailsY + 6);
      doc.setFont("helvetica", "normal"); doc.text("40 minutes", rightX + 22, detailsY + 6);
      
      const b = editedData.enrolment?.boys || 0;
      const g = editedData.enrolment?.girls || 0;
      doc.setFont("helvetica", "bold"); doc.text("Enrolment:", rightX, detailsY + 12);
      doc.setFont("helvetica", "normal"); doc.text(`Boys: ${b}  Girls: ${g}  Total: ${b+g}`, rightX + 22, detailsY + 12);
      
      doc.setFont("helvetica", "bold"); doc.text("Date:", rightX, detailsY + 18);
      doc.setFont("helvetica", "normal"); doc.text(meta.date || "________", rightX + 22, detailsY + 18);

      currentY = detailsY + 24;
      doc.setDrawColor(0); doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      const drawFullWidthBlock = (title: string, content: string, y: number) => {
        doc.setFont("helvetica", "bold"); 
        doc.text(`${title}:`, margin, y);
        
        doc.setFont("helvetica", "normal");
        
        // 1. Get the exact width of just the title and colon
        const titleWidth = doc.getTextWidth(`${title}:`); 
        
        // 2. Add a guaranteed 2mm physical space after the colon
        const textStartX = margin + titleWidth + 5; 
        
        // 3. Calculate remaining page width dynamically
        const maxTextWidth = pageWidth - margin - textStartX;
        
        const lines = doc.splitTextToSize(String(content || ""), maxTextWidth);
        doc.text(lines, textStartX, y);
        
        // 4. Return height with bottom margin for vertical spacing
        return (lines.length * 5) + 4; 
      };

      currentY += drawFullWidthBlock("Sub-topic", editedData.subtopic, currentY);
      currentY += drawFullWidthBlock("Rationale", editedData.rationale, currentY);
      currentY += drawFullWidthBlock("Specific Outcomes", editedData.specific, currentY);
      currentY += drawFullWidthBlock("Pre-Requisite Knowledge", editedData.prerequisite, currentY);
      currentY += drawFullWidthBlock("Teaching/Learning Aids", editedData.materials, currentY);
      currentY += drawFullWidthBlock("References", editedData.references, currentY);

      currentY += 4;

      // 5. TABLE RENDERING
      const tableHeaders = columns.map(c => c.label.toUpperCase());
      const tableBody = editedData.steps.map((row: any) => columns.map(c => {
        let val = row[c.key] || "";
        if (c.key === 'stage' && row.time) val += `\n(${row.time})`;
        return val;
      }));

      autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.1 },
        bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
        styles: { fontSize: 10, cellPadding: 3, valign: 'top', overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 35 } }, 
        margin: { left: margin, right: margin, bottom: margin }
      });

      // 6. EVALUATION EXPORT
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      
      if (finalY > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          finalY = 20;
      }

      doc.setFont("helvetica", "bold"); 
      doc.text("Evaluation:", margin, finalY);
      doc.setFont("helvetica", "normal");
      const evalTitleWidth = doc.getTextWidth("Evaluation: ");
      const evalLines = doc.splitTextToSize(String(editedData.evaluation || ""), pageWidth - margin * 2 - evalTitleWidth);
      doc.text(evalLines, margin + evalTitleWidth, finalY);

      doc.save(`Catchup_Plan_${meta.grade || 'TaRL'}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20 font-sans">
      
      {/* 🚀 STICKY ACTION HEADER */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 shadow-lg print:hidden">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <ArrowLeft size={18} /> <span className="hidden sm:inline font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setIsColumnModalOpen(true)}
                disabled={isLocked}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors border border-slate-700 whitespace-nowrap"
            >
                <Settings2 size={16} /> <span className="hidden md:inline font-medium">Table Layout</span>
            </button>

            <button 
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold whitespace-nowrap ${
                isLocked ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' 
                         : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 animate-pulse'
              }`}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              <span className="hidden sm:inline">{isLocked ? "Unlock to Edit" : "Editing Mode"}</span>
            </button>

            <button onClick={handleSaveToCloud} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20 whitespace-nowrap">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save to Cloud"}</span>
            </button>

            <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-indigo-900/20 whitespace-nowrap">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              <span className="hidden sm:inline">{isExporting ? "Generating..." : "Export PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🎛️ COLUMN CONFIGURATION MODAL */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 p-4 sm:p-5 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg sm:text-xl">Table Layout</h3>
                <p className="text-slate-400 text-xs sm:text-sm">Customize columns</p>
              </div>
              <button onClick={() => setIsColumnModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto space-y-3 bg-slate-50 text-slate-900">
              {columns.map((col, index) => (
                <div key={col.key} className="flex items-center gap-2 sm:gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleMoveColumn(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => handleMoveColumn(index, 'down')} disabled={index === columns.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14} /></button>
                  </div>
                  <input 
                    type="text" 
                    value={col.label} 
                    onChange={(e) => handleColumnLabelChange(index, e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <div className="flex gap-1">
                      {col.key !== 'stage' && col.key !== 'time' && (
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
              <button onClick={handleAddColumn} className="w-full py-2.5 sm:py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-50 transition-all flex justify-center items-center gap-2">
                <Plus size={18} /> Add New Column at End
              </button>
              <button onClick={() => setIsColumnModalOpen(false)} className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-indigo-500 transition-all shadow-lg">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 MAIN DOCUMENT CONTAINER (EXACT ZAMBIAN FORMAT) */}
      <div className="p-4 sm:p-8 flex justify-center print:p-0 print:block overflow-x-auto">
        <div ref={componentRef} className="w-full max-w-[1200px] min-w-[900px] bg-white text-slate-900 shadow-2xl rounded-sm print:shadow-none print:w-full print:min-w-full p-8 sm:p-12">
          
          {/* HEADER SECTION (Top-down structure) */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
             
             {/* 1. CENTER LOGOS AND HEADINGS (BIG TO SMALL, NO SPACES) */}
             <div className="flex flex-col items-center justify-center text-center px-4 mb-8">
                <div className="flex items-center justify-center gap-4 mb-16">
                   <img src={COAT_OF_ARMS_URL} alt="Coat of Arms" className="w-20 h-20 object-contain" />
                   {editedData.logo_url && <img src={editedData.logo_url} alt="School Logo" className="w-20 h-20 object-contain" />}
                </div>
                
                <h1 className="text-2xl font-black uppercase leading-none text-slate-900 mb-1">REPUBLIC OF ZAMBIA</h1>
                <h2 className="text-xl font-bold uppercase leading-none text-slate-800 mb-1">MINISTRY OF EDUCATION</h2>
                
                <h3 
                  contentEditable={!isLocked} suppressContentEditableWarning
                  onBlur={(e) => handleHeaderEdit('schoolName', e.currentTarget.textContent || "")}
                  className={`text-lg font-semibold uppercase leading-none text-slate-700 mb-1 w-full max-w-md ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                >
                  {editedData.schoolName || meta.school || "PRIMARY SCHOOL"}
                </h3>
                
                <h4 className="text-base font-medium uppercase leading-none text-slate-600">
                  {(meta.subject || editedData.subject || "CATCH-UP").toUpperCase()} LESSON PLAN
                </h4>
             </div>

             {/* 2. TWO-COLUMN DETAILS GRID */}
             <div className="grid grid-cols-2 gap-4 text-[15px]">
                {/* LEFT COLUMN */}
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <strong className="w-20">Teacher:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleHeaderEdit('teacherName', e.currentTarget.textContent || "")}
                          className={`flex-1 ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{editedData.teacherName}</span>
                    </div>
                    <div className="flex gap-2">
                        <strong className="w-20">Grade:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleHeaderEdit('grade', e.currentTarget.textContent || "")}
                          className={`flex-1 ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{meta.grade || editedData.grade}</span>
                    </div>
                    <div className="flex gap-2">
                        <strong className="w-20">Subject:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleHeaderEdit('subject', e.currentTarget.textContent || "")}
                          className={`flex-1 ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{meta.subject || editedData.subject}</span>
                    </div>
                    <div className="flex gap-2">
                        <strong className="w-20">Topic:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleMetaEdit('topic', e.currentTarget.textContent || "")}
                          className={`flex-1 ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{editedData.topic}</span>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-2 flex flex-col items-end text-right">
                    <div className="flex justify-end gap-2 w-full">
                        <strong className="w-20 text-left">Time:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleMetaEdit('time', e.currentTarget.textContent || "")}
                          className={`w-32 text-left ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{editedData.time}</span>
                    </div>
                    <div className="flex justify-end gap-2 w-full">
                        <strong className="w-20 text-left">Duration:</strong> 
                        <span className="w-32 text-left">40 minutes</span>
                    </div>
                    <div className="flex justify-end gap-2 w-full">
                        <strong className="w-20 text-left">Enrolment:</strong> 
                        <div className="w-48 text-left flex gap-1">
                          B: <span contentEditable={!isLocked} suppressContentEditableWarning onBlur={(e) => handleEnrolmentEdit('boys', e.currentTarget.textContent || "0")} className={!isLocked ? 'border-b border-dashed border-indigo-300 outline-none w-6 text-center' : ''}>{editedData.enrolment?.boys || 0}</span>
                          G: <span contentEditable={!isLocked} suppressContentEditableWarning onBlur={(e) => handleEnrolmentEdit('girls', e.currentTarget.textContent || "0")} className={!isLocked ? 'border-b border-dashed border-indigo-300 outline-none w-6 text-center' : ''}>{editedData.enrolment?.girls || 0}</span>
                          T: <span>{(editedData.enrolment?.boys || 0) + (editedData.enrolment?.girls || 0)}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 w-full">
                        <strong className="w-20 text-left">Date:</strong> 
                        <span 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleHeaderEdit('date', e.currentTarget.textContent || "")}
                          className={`w-32 text-left ${!isLocked ? 'border-b border-dashed border-indigo-300 outline-none focus:bg-indigo-50' : ''}`}
                        >{meta.date || "________"}</span>
                    </div>
                </div>
             </div>
          </div>

          {/* META DATA BLOCKS (Linear format) */}
          <div className="space-y-4 text-[15px] mb-8 text-slate-800">
            {[
              { title: "Sub-topic", key: "subtopic" },
              { title: "Rationale", key: "rationale" },
              { title: "Specific Outcomes", key: "specific" },
              { title: "Pre-Requisite Knowledge", key: "prerequisite" },
              { title: "Teaching/Learning Aids", key: "materials" },
              { title: "References", key: "references" }
            ].map((section, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <strong className="whitespace-nowrap">{section.title}:</strong>
                <div 
                  contentEditable={!isLocked} suppressContentEditableWarning
                  onBlur={(e) => handleMetaEdit(section.key, e.currentTarget.innerText || "")}
                  className={`flex-1 whitespace-pre-wrap leading-relaxed ${!isLocked ? 'p-1 -m-1 border border-dashed border-indigo-200 bg-indigo-50/50 rounded outline-none' : ''}`}
                >
                  {editedData[section.key]}
                </div>
              </div>
            ))}
          </div>

          {/* DYNAMIC STEPS TABLE */}
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="bg-slate-100 text-black font-bold p-3 text-[13px] uppercase border border-slate-900">
                      {col.label}
                    </th>
                  ))}
                  {!isLocked && <th className="bg-slate-100 text-black p-3 w-10 border border-slate-900 print:hidden"></th>}
                </tr>
              </thead>
              <tbody>
                {editedData.steps.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="group hover:bg-slate-50">
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="border border-slate-900 p-0 relative align-top">
                        
                        {col.key === 'stage' && row.time && isLocked && (
                           <div className="absolute bottom-2 right-2 text-[11px] font-bold text-slate-600">
                             ({row.time})
                           </div>
                        )}

                        <div 
                          contentEditable={!isLocked} suppressContentEditableWarning
                          onBlur={(e) => handleCellEdit(rowIndex, col.key, e.currentTarget.innerText || "")}
                          className={`p-3 text-[14px] text-slate-800 whitespace-pre-wrap min-h-[60px] w-full ${!isLocked ? 'focus:bg-indigo-50/50 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500' : ''}`}
                        >
                          {row[col.key]}
                        </div>
                      </td>
                    ))}
                    {!isLocked && (
                      <td className="border border-slate-900 p-2 align-middle text-center print:hidden bg-slate-50">
                        <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => addRow(rowIndex)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-600 hover:text-white"><PlusCircle size={16}/></button>
                           <button onClick={() => removeRow(rowIndex)} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-600 hover:text-white"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLocked && (
              <button 
                onClick={() => addRow(editedData.steps.length - 1)}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-400 text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 rounded flex items-center justify-center gap-2 font-bold print:hidden"
              >
                <Plus size={20} /> Add New Row
              </button>
            )}
          </div>

          {/* 🆕 EVALUATION SECTION */}
          <div className="mt-8 pt-6 border-t border-slate-300">
            <div className="flex gap-2 items-start text-[15px] text-slate-800">
              <strong className="whitespace-nowrap">Evaluation:</strong>
              <div 
                contentEditable={!isLocked} suppressContentEditableWarning
                onBlur={(e) => handleMetaEdit('evaluation', e.currentTarget.innerText || "")}
                className={`flex-1 whitespace-pre-wrap leading-relaxed min-h-[40px] ${
                  !isLocked 
                    ? 'p-2 -m-2 border border-dashed border-indigo-200 bg-indigo-50/50 rounded outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 cursor-text' 
                    : ''
                }`}
                data-placeholder={!isLocked ? "Enter post-lesson evaluation here..." : ""}
              >
                {editedData.evaluation || ""}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}