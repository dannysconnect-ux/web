import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CloudUpload, Printer, Loader2, BookOpen,
  Lock, Unlock, Settings2, Plus, Trash2, X, ArrowUp, ArrowDown, PlusCircle, CheckCircle2
} from 'lucide-react'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios'; 

import { db, auth } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 

// ✅ IMPORT DEFAULT COAT OF ARMS
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

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
  { key: 'method', label: 'METHOD' },
  { key: 'time', label: 'TIME' }
];

// =====================================================================
// 🛠️ BUTTERY-SMOOTH EDITABLE COMPONENTS
// =====================================================================

const EditableTextCell = ({ 
  value, 
  onChange, 
  className = "", 
  singleLine = false 
}: { 
  value?: string, 
  onChange: (val: string) => void, 
  className?: string,
  singleLine?: boolean
}) => {
  const [localText, setLocalText] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(value || "");
  }, [value]);

  // ✅ AUTO-RESIZE LOGIC: Makes height flexible based on content
  useEffect(() => {
    if (!singleLine && textareaRef.current) {
      // Reset height to auto to correctly shrink if text is deleted
      textareaRef.current.style.height = 'auto';
      // Set height to the actual scroll height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localText, singleLine]);

  if (singleLine) {
    return (
      <input
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        className={`bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-500 focus:bg-white rounded outline-none transition-colors w-full px-1 ${className}`}
      />
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onBlur={(e) => onChange(e.target.value)}
      rows={1}
      className={`w-full min-h-[40px] p-1 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-500 focus:bg-white rounded outline-none resize-none overflow-hidden transition-colors print:resize-none print:border-none print:p-0 ${className}`}
    />
  );
};

// =====================================================================
// 🏫 MAIN COMPONENT
// =====================================================================

export default function LessonPlanView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesData, setNotesData] = useState<any>(null);

  // 1. EXTRACT DATA
  const { lessonData, meta, isLocked: passedLock, customColumns } = location.state || {};
  const schoolName = lessonData?.schoolName || meta?.school || "Primary School";
  const schoolLogo = meta?.schoolLogo || null; 

  // ✅ 2. LOCAL STATE FOR EDITING
  const [localPlanData, setLocalPlanData] = useState<any>(null);
  
  // ⚡️ DYNAMIC SPREADSHEET STATE
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [isLocked, setIsLocked] = useState(false); 
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  useEffect(() => {
    if (!lessonData || !meta) {
      console.warn("Missing lesson data, redirecting...");
      navigate('/teacher-dashboard'); 
    } else {
      if (passedLock) setIsLocked(true);
      if (customColumns && Array.isArray(customColumns) && customColumns.length > 0) {
        setColumns(customColumns);
      }
      setLocalPlanData(lessonData);
    }
  }, [lessonData, meta, navigate, passedLock, customColumns]);

  if (!localPlanData) return null; 

  // --- 🛠️ UPDATE HANDLERS ---
  const handlePlanUpdate = (field: string, value: string) => {
    setLocalPlanData({ ...localPlanData, [field]: value });
  };

  const handleEnrolmentChange = (field: string, value: string) => {
    setLocalPlanData((prev: any) => ({
      ...prev,
      enrolment: { ...(prev.enrolment || {}), [field]: parseInt(value) || 0 }
    }));
  };
  
  const handleStepUpdate = (index: number, field: string, value: string) => {
    const newSteps = [...(localPlanData.steps || [])];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setLocalPlanData({ ...localPlanData, steps: newSteps });
  };

  // --- 🛠️ ROW & COLUMN MANAGEMENT ---
  const handleDeleteRow = (index: number) => {
    const newSteps = localPlanData.steps.filter((_: any, i: number) => i !== index);
    setLocalPlanData({ ...localPlanData, steps: newSteps });
  };

  const handleInsertRow = (index: number) => {
    const newSteps = [...(localPlanData.steps || [])];
    newSteps.splice(index + 1, 0, { stage: "", teacherActivity: "", learnerActivity: "", method: "", time: "" });
    setLocalPlanData({ ...localPlanData, steps: newSteps });
  };

  const handleAddRowToBottom = () => {
    const newSteps = [...(localPlanData.steps || []), { stage: "", teacherActivity: "", learnerActivity: "", method: "", time: "" }];
    setLocalPlanData({ ...localPlanData, steps: newSteps });
  };

  const handleAddColumn = () => {
    const newKey = `custom_${Date.now()}`;
    setColumns([...columns, { key: newKey, label: "NEW COLUMN" }]);
  };

  // --- CLEANUP SUBTOPIC ---
  const cleanSubtopic = (topic: string, subtopic: string) => {
      if (!subtopic || !topic) return subtopic;
      const normalizedTopic = topic.toLowerCase().trim();
      const normalizedSub = subtopic.toLowerCase().trim();
      
      if (normalizedSub.includes(normalizedTopic)) {
          return subtopic.replace(topic, "").replace(/\(Unit\s*\d+(\.\d+)*\)/i, "").trim() || subtopic;
      }
      return subtopic;
  };

  const displaySubtopic = cleanSubtopic(localPlanData.topic, localPlanData.subtopic);

  // --- GENERATE NOTES ---
  const handleGenerateNotes = async () => {
    setGeneratingNotes(true);
    try {
        const endpoint = `${API_BASE}/api/v1/new/generate-lesson-notes`;
        const response = await axios.post(endpoint, {
            grade: meta.grade,
            subject: meta.subject,
            topic: localPlanData.topic,
            subtopic: displaySubtopic,
            uid: auth.currentUser?.uid 
        });

        if (response.data && response.data.data) {
            setNotesData(response.data.data);
            setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 500);
        }
    } catch (error: any) {
        console.error("Error generating notes:", error);
        alert("Failed to generate notes.");
    } finally {
        setGeneratingNotes(false);
    }
  };

  // --- 🛡️ BACKGROUND CAPTURE (FLYWHEEL) ---
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
          uid: user.uid, planType: "lesson_plan", grade: meta.grade, subject: meta.subject, term: meta.term,
          weekNumber: meta.weekNumber || 1, schoolId: schoolId || null,
          finalEditedData: { ...localPlanData, columns: columns, isLocked } 
        })
      }).catch(err => console.warn("Background moat capture failed:", err));
    } catch (e) { console.warn("Could not capture edits:", e); }
  };

  // --- SAVE TO FIREBASE ---
  const handleSaveToCloud = async () => {
    if (!auth.currentUser) return alert("You must be logged in to save.");
    
    setSaving(true);
    captureEditsBackground();

    try {
        await addDoc(collection(db, "generated_lesson_plans"), {
            userId: auth.currentUser.uid,
            ...meta, 
            school: schoolName, 
            schoolLogo: schoolLogo, 
            planData: localPlanData, 
            notesData: notesData,
            customColumns: columns, 
            isLocked: isLocked,     
            createdAt: serverTimestamp(),
            type: "Lesson Plan"
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
        console.error("Error saving document:", err);
        alert(`Failed to save: ${err.message}`);
    } finally {
        setSaving(false);
    }
  };

  // ✅ HELPER: Convert Image URL to Base64 
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

  // ---------------------------------------------------------
  // 🖨️ PDF GENERATOR
  // ---------------------------------------------------------
  const handleDownloadPDF = async () => {
    captureEditsBackground();

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 10; 

    // --- 🟢 LOGO LOGIC ---
    try {
        let logoData = "";
        if (schoolLogo) logoData = await getBase64ImageFromURL(schoolLogo);
        if (!logoData) logoData = await getBase64ImageFromURL(COAT_OF_ARMS_URL);

        if (logoData) {
            const imgW = 20, imgH = 20;
            const x = (pageWidth / 2) - (imgW / 2);
            doc.addImage(logoData, 'PNG', x, yPos, imgW, imgH);
            yPos += 28; 
        }
    } catch (e) { yPos += 10; }

    // --- 1. HEADER TEXT ---
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 0);

    if (schoolLogo) {
        doc.setFontSize(16);
        doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
    } else {
        doc.setFontSize(12); doc.text("REPUBLIC OF ZAMBIA", pageWidth / 2, yPos, { align: "center" }); yPos += 6;
        doc.setFontSize(10); doc.text("MINISTRY OF EDUCATION", pageWidth / 2, yPos, { align: "center" }); yPos += 7;
        doc.setFontSize(14); doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" }); yPos += 9;
    }

    doc.setFontSize(12);
    doc.text(`${(meta.subject || "SUBJECT").toUpperCase()} LESSON PLAN`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    
    doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 8;

    // --- 2. METADATA GRID ---
    doc.setFontSize(10); 
    doc.setFont("times", "normal");
    
    const leftX = margin;
    const rightX = pageWidth / 2 + 10;
    const lineHeight = 6;
    const txt = (str: any) => str || "";

    doc.text(`Teacher: ${txt(localPlanData.teacherName || meta.teacherName || auth.currentUser?.displayName)}`, leftX, yPos);
    doc.text(`Grade: ${txt(meta.grade)}`, leftX, yPos + lineHeight);
    doc.text(`Subject: ${txt(meta.subject)}`, leftX, yPos + lineHeight * 2);
    doc.text(`Topic: ${txt(localPlanData.topic || meta.topic)}`, leftX, yPos + lineHeight * 3);
    doc.text(`Sub-topic: ${txt(localPlanData.subtopic)}`, leftX, yPos + lineHeight * 4);
    
    doc.text(`Time: ${txt(localPlanData.time)}`, rightX, yPos);
    doc.text(`Duration: ${txt(localPlanData.duration || "40 minutes")}`, rightX, yPos + lineHeight);
    
    const boys = meta.boys || localPlanData.enrolment?.boys || 0;
    const girls = meta.girls || localPlanData.enrolment?.girls || 0;
    const total = parseInt(boys) + parseInt(girls);
    
    doc.text(`Enrolment: Boys: ${boys}   Girls: ${girls}   Total: ${total}`, rightX, yPos + lineHeight * 2);
    doc.text(`Date: ${txt(localPlanData.date || meta.startDate || "..................")}`, rightX, yPos + lineHeight * 3);

    yPos += 35; 

    // --- 3. TEXT BLOCKS ---
    const drawBlock = (label: string, content: string) => {
        if (!content) return; 
        doc.setFont("times", "bold"); doc.text(label, margin, yPos);
        const labelWidth = doc.getTextWidth(label);
        doc.setFont("times", "normal");
        const splitText = doc.splitTextToSize(content, pageWidth - margin - labelWidth - 15);
        doc.text(splitText, margin + labelWidth + 2, yPos);
        yPos += (splitText.length * 5) + 3;
    };

    drawBlock("Rationale: ", localPlanData.rationale);
    drawBlock("Specific Outcomes: ", localPlanData.specific || localPlanData.competence);
    drawBlock("Pre-Requisite Knowledge: ", localPlanData.prerequisite);
    drawBlock("Teaching/Learning Aids: ", localPlanData.materials);
    drawBlock("References: ", localPlanData.references || `Zambian Syllabus Grade ${meta.grade}`);
    yPos += 5; 

    // --- 4. ⚡️ DYNAMIC TABLE GENERATION ---
    const tableHeaders = [columns.map(col => col.label)];
    const stepsData = Array.isArray(localPlanData.steps) ? localPlanData.steps : [];
    
    const tableBody = stepsData.map((step: any) => {
        return columns.map(col => {
            const val = step[col.key];
            if (col.key === 'stage' && val) return { content: val, styles: { fontStyle: 'bold' } };
            return String(val || "");
        });
    });

    autoTable(doc, {
        startY: yPos,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid', 
        styles: { font: "times", fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], cellPadding: 3, valign: 'top', overflow: 'linebreak' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] },
        didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
    });

    // --- 5. FOOTER (Evaluation) ---
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 270) { doc.addPage(); finalY = 20; }
    
    doc.setFont("times", "bold");
    doc.text("Evaluation: ", margin, finalY);
    doc.setLineWidth(0.1);
    doc.line(margin + 20, finalY, pageWidth - margin, finalY); 
    doc.line(margin, finalY + 8, pageWidth - margin, finalY + 8); 
    
    finalY += 20;

    // --- 6. 📚 APPEND LESSON NOTES TO PDF ---
    if (notesData) {
        doc.addPage();
        finalY = 20;
        const contentWidth = pageWidth - (margin * 2);

        // Helper to prevent text from running off the page
        const checkPageBreak = (heightRequired: number) => {
            if (finalY + heightRequired > 280) {
                doc.addPage();
                finalY = 20;
            }
        };

        const writeSectionHeader = (title: string) => {
            checkPageBreak(15);
            doc.setFont("times", "bold");
            doc.setFontSize(11);
            doc.text(title.toUpperCase(), margin, finalY);
            finalY += 6;
            doc.setFont("times", "normal");
            doc.setFontSize(10);
        };

        const writeParagraph = (text: string, indent = 0) => {
            if (!text) return;
            const lines = doc.splitTextToSize(String(text), contentWidth - indent);
            checkPageBreak(lines.length * 5 + 5);
            doc.text(lines, margin + indent, finalY);
            finalY += (lines.length * 5) + 2;
        };

        // Notes Title
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("LESSON NOTES (Blackboard)", pageWidth / 2, finalY, { align: "center" });
        finalY += 10;

        if (notesData.topic_heading) {
            doc.setFontSize(12);
            doc.text(notesData.topic_heading.toUpperCase(), pageWidth / 2, finalY, { align: "center" });
            finalY += 10;
        }

        doc.setFontSize(10);
        doc.setFont("times", "normal");

        if (notesData.key_definitions && notesData.key_definitions.length > 0) {
            writeSectionHeader("Key Definitions");
            notesData.key_definitions.forEach((def: any) => {
                writeParagraph(`${def.term}: ${def.definition}`, 5);
            });
            finalY += 4;
        }

        if (notesData.explanation_points && notesData.explanation_points.length > 0) {
            writeSectionHeader("Explanation");
            notesData.explanation_points.forEach((pt: string) => {
                writeParagraph(`• ${pt}`, 5);
            });
            finalY += 4;
        }

        if (notesData.worked_examples && notesData.worked_examples.length > 0) {
            writeSectionHeader("Worked Examples");
            notesData.worked_examples.forEach((ex: any, i: number) => {
                writeParagraph(`Example ${i + 1}: ${ex.question}`, 5);
                doc.setFont("times", "italic");
                writeParagraph(`Solution: ${ex.solution}`, 10);
                doc.setFont("times", "normal");
            });
            finalY += 4;
        }

        if (notesData.class_exercise && notesData.class_exercise.length > 0) {
            writeSectionHeader("Class Exercise");
            notesData.class_exercise.forEach((q: string, i: number) => {
                writeParagraph(`${i + 1}. ${q}`, 5);
            });
            finalY += 4;
        }

        if (notesData.homework_question) {
            writeSectionHeader("Homework");
            if (Array.isArray(notesData.homework_question)) {
                notesData.homework_question.forEach((q: string) => {
                    writeParagraph(`• ${q}`, 5);
                });
            } else {
                writeParagraph(notesData.homework_question, 5);
            }
        }
    }

    const safeSubtopic = (localPlanData.subtopic || "Lesson").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    doc.save(`LessonPlan_Grade${meta.grade}_${safeSubtopic}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20">
      
      {/* 🚀 RESPONSIVE TOP NAVIGATION */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 shadow-sm print:hidden">
        <div className="flex items-center w-full sm:w-auto gap-4">
          <button onClick={() => navigate('/teacher-dashboard')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
              <h1 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">Lesson Plan Preview</h1>
              <p className="text-[10px] sm:text-xs text-slate-500">{schoolName} • {meta.subject}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
           <button 
                onClick={handleGenerateNotes} 
                disabled={generatingNotes || notesData}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border rounded-lg font-medium transition-colors text-[11px] sm:text-sm ${
                    notesData ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                }`}
            >
            {generatingNotes ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
            <span>{generatingNotes ? "Generating..." : notesData ? "Notes Added" : "Generate Notes"}</span>
          </button>

          {/* ⚡️ MANAGE COLUMNS BUTTON */}
          <button 
            onClick={() => setIsColumnModalOpen(true)}
            className="flex justify-center items-center gap-1.5 sm:gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-medium text-[11px] sm:text-sm"
          >
            <Settings2 size={14} />
            <span className="hidden sm:inline">Columns</span>
          </button>

          {/* 🔒 THE LOCK BUTTON */}
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className={`flex justify-center items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all border ${
              isLocked ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            <span className="hidden sm:inline">{isLocked ? "Locked" : "Template"}</span>
          </button>

          <button onClick={handleSaveToCloud} disabled={saving || saveSuccess} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-[11px] sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} className="text-emerald-600"/> : <CloudUpload size={14} />}
            <span className="hidden sm:inline">{saving ? "Saving..." : saveSuccess ? "Saved" : "Save"}</span>
          </button>
          
          <button onClick={handleDownloadPDF} className="flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 shadow-md transition-colors text-[11px] sm:text-sm">
            <Printer size={14} /> Save PDF
          </button>
        </div>
      </div>

      <div className="w-full max-w-[210mm] mx-auto mt-4 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/50 p-2 rounded print:hidden">
         Click any field below to edit your lesson plan directly
      </div>

      {/* 📄 RESPONSIVE PAPER PREVIEW */}
      <div className="w-full max-w-[210mm] mx-auto sm:mt-4 bg-white shadow-sm sm:shadow-2xl p-4 sm:p-[20mm] sm:min-h-[297mm] text-slate-900 sm:text-black font-sans sm:font-serif text-xs sm:text-[11pt] leading-snug print:p-0 print:shadow-none print:m-0 print:font-serif">
        
        {/* Header with Logo Logic */}
        <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 text-center">
             <img src={schoolLogo || COAT_OF_ARMS_URL} alt="School Logo" className="h-14 w-14 sm:h-20 sm:w-20 object-contain mb-1 sm:mb-2" />
             {schoolLogo ? ( 
                 <EditableTextCell singleLine className="text-base sm:text-xl font-bold uppercase text-center w-full" value={schoolName} onChange={(val) => handlePlanUpdate('schoolName', val)} /> 
             ) : (
                 <>
                    <h3 className="text-[10px] sm:text-sm font-bold uppercase">Republic of Zambia</h3>
                    <h3 className="text-[9px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">Ministry of Education</h3>
                    <EditableTextCell singleLine className="text-base sm:text-xl font-bold uppercase text-center w-full" value={schoolName} onChange={(val) => handlePlanUpdate('schoolName', val)} />
                 </>
             )}
             <h3 className="text-sm sm:text-lg font-bold uppercase underline decoration-1 underline-offset-4 mt-1 sm:mt-2">
                 {meta.subject} LESSON PLAN
             </h3>
        </div>

        {/* Responsive Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="space-y-1 sm:pr-4">
                <div className="flex items-center"><strong className="w-20 sm:w-24">Teacher:</strong> 
                   <EditableTextCell singleLine value={localPlanData.teacherName || meta.teacherName} onChange={(val) => handlePlanUpdate('teacherName', val)} />
                </div>
                <div className="flex items-center"><strong className="w-20 sm:w-24">Grade:</strong> <span className="px-1">{meta.grade}</span></div>
                <div className="flex items-center"><strong className="w-20 sm:w-24">Subject:</strong> <span className="px-1">{meta.subject}</span></div>
                <div className="flex items-center"><strong className="w-20 sm:w-24">Topic:</strong> 
                   <EditableTextCell singleLine value={localPlanData.topic} onChange={(val) => handlePlanUpdate('topic', val)} />
                </div>
                <div className="flex items-center"><strong className="w-20 sm:w-24">Sub-topic:</strong> 
                   <EditableTextCell singleLine value={localPlanData.subtopic} onChange={(val) => handlePlanUpdate('subtopic', val)} />
                </div>
            </div>
            
            <div className="space-y-1 sm:pl-4 mt-2 sm:mt-0">
                <div className="flex items-center sm:justify-end"><strong className="w-20">Time:</strong> 
                   <EditableTextCell singleLine className="sm:w-32 sm:text-right" value={localPlanData.time} onChange={(val) => handlePlanUpdate('time', val)} />
                </div>
                <div className="flex items-center sm:justify-end"><strong className="w-20">Duration:</strong> 
                   <EditableTextCell singleLine className="sm:w-32 sm:text-right" value={localPlanData.duration} onChange={(val) => handlePlanUpdate('duration', val)} />
                </div>
                <div className="flex items-center sm:justify-end py-1">
                    <strong className="w-20">Enrolment:</strong> 
                    <span className="flex items-center gap-1">
                      B: <input type="number" className="w-8 text-center bg-transparent border-b border-slate-200 sm:border-transparent outline-none text-indigo-600 font-bold" value={localPlanData.enrolment?.boys || 0} onChange={(e) => handleEnrolmentChange('boys', e.target.value)} /> / 
                      G: <input type="number" className="w-8 text-center bg-transparent border-b border-slate-200 sm:border-transparent outline-none text-rose-500 font-bold" value={localPlanData.enrolment?.girls || 0} onChange={(e) => handleEnrolmentChange('girls', e.target.value)} /> / 
                      Total: {parseInt(localPlanData.enrolment?.boys || 0) + parseInt(localPlanData.enrolment?.girls || 0)}
                    </span>
                </div>
                <div className="flex items-center sm:justify-end"><strong className="w-20">Date:</strong> 
                   <EditableTextCell singleLine className="sm:w-32 sm:text-right" value={localPlanData.date} onChange={(val) => handlePlanUpdate('date', val)} />
                </div>
            </div>
        </div>

        {/* Text Blocks */}
        <div className="space-y-2 sm:space-y-1 mb-6 text-justify">
            {[
                { label: "Rationale", key: "rationale" },
                { label: "Specific Outcomes", key: "specific" }, 
                { label: "Pre-Requisite Knowledge", key: "prerequisite" },
                { label: "Teaching/Learning Aids", key: "materials" },
                { label: "References", key: "references" },
            ].map((block, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:gap-2 items-start">
                    <strong className="whitespace-nowrap pt-1 text-slate-600 sm:text-black">{block.label}:</strong>
                    <div className="w-full sm:flex-1 bg-slate-50 sm:bg-transparent rounded sm:rounded-none">
                        <EditableTextCell 
                            value={localPlanData[block.key] || (block.key === 'specific' ? localPlanData.competence : "")} 
                            onChange={(val) => handlePlanUpdate(block.key, val)} 
                        />
                    </div>
                </div>
            ))}
        </div>

        {/* ⚡️ DESKTOP VIEW: EDITABLE SPREADSHEET TABLE */}
        <table className="hidden md:table w-full border-collapse border border-black mb-8 text-[10pt] print:table">
            <thead>
                <tr>
                    {columns.map((col, i) => (
                        <th key={i} className={`border border-black p-2 text-left bg-gray-100 font-bold uppercase ${col.key === 'stage' ? 'w-[15%]' : ''}`}>
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {(localPlanData.steps || []).map((step: any, idx: number) => (
                    <tr key={idx} className="group relative">
                        {columns.map((col) => {
                            if (col.key === 'stage') {
                                return (
                                    <td key={col.key} className="border border-black p-0 font-bold align-top relative">
                                       <EditableTextCell value={step[col.key]} onChange={(val) => handleStepUpdate(idx, col.key, val)} className="font-bold" />
                                       
                                       {/* ROW ACTIONS */}
                                       <div className="absolute -left-10 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                           <button onClick={() => handleInsertRow(idx)} className="p-1 text-slate-500 hover:bg-slate-200 rounded" title="Insert Row Below"><Plus size={14} /></button>
                                           <button onClick={() => handleDeleteRow(idx)} className="p-1 text-rose-500 hover:bg-rose-100 rounded" title="Delete Row"><Trash2 size={14} /></button>
                                       </div>
                                    </td>
                                )
                            }
                            return (
                                <td key={col.key} className="border border-black p-0 align-top">
                                   <EditableTextCell value={step[col.key]} onChange={(val) => handleStepUpdate(idx, col.key, val)} />
                                </td>
                            )
                        })}
                    </tr>
                ))}
                {/* BOTTOM ROW ADD BUTTON */}
                <tr className="print:hidden">
                    <td colSpan={columns.length} className="border border-black p-2 bg-gray-50 text-center">
                        <button onClick={handleAddRowToBottom} className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors text-xs">
                            <PlusCircle size={14} /> Add New Row
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>

        {/* 📱 MOBILE VIEW: COMPACT STACKED CARDS */}
        <div className="md:hidden flex flex-col gap-4 mb-6 print:hidden font-sans">
            {(localPlanData.steps || []).map((step: any, idx: number) => {
                const stageCol = columns.find(c => c.key === 'stage');
                const timeCol = columns.find(c => c.key === 'time');
                const otherCols = columns.filter(c => c.key !== 'stage' && c.key !== 'time');

                return (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm space-y-3 relative">
                        
                        {!isLocked && (
                            <div className="absolute -top-3 -right-2 flex gap-1 z-10">
                                <button onClick={() => handleDeleteRow(idx)} className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-full shadow-sm transition-colors"><Trash2 size={12}/></button>
                            </div>
                        )}

                        {/* Card Header */}
                        {(stageCol || timeCol) && (
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 pr-6">
                                {stageCol ? (
                                    <EditableTextCell singleLine className="font-bold text-indigo-700 text-sm w-[70%]" value={step[stageCol.key]} onChange={(val) => handleStepUpdate(idx, stageCol.key, val)} />
                                ) : <div></div>}
                                
                                {timeCol && (
                                    <EditableTextCell singleLine className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded w-16 text-center" value={step[timeCol.key]} onChange={(val) => handleStepUpdate(idx, timeCol.key, val)} />
                                )}
                            </div>
                        )}
                        
                        {/* Dynamic Content Sections */}
                        <div className="space-y-2.5">
                            {otherCols.map(col => (
                                <div key={col.key}>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{col.label}</span>
                                    <EditableTextCell 
                                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded min-h-[40px]" 
                                        value={step[col.key]} 
                                        onChange={(val) => handleStepUpdate(idx, col.key, val)} 
                                    />
                                </div>
                            ))}
                        </div>

                        {!isLocked && (
                            <button onClick={() => handleInsertRow(idx)} className="w-full mt-2 py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded border border-dashed border-indigo-200 flex items-center justify-center gap-1 transition-colors">
                                <PlusCircle size={14}/> Insert Stage Below
                            </button>
                        )}

                    </div>
                )
            })}
            
            {!isLocked && (
                <button onClick={handleAddRowToBottom} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                    <Plus size={16} /> Add New Stage
                </button>
            )}
        </div>

        {/* Evaluation Footer */}
        <div className="mt-6 sm:mt-8 pt-2 sm:pt-4 print:break-inside-avoid">
            <div className="flex gap-2 items-end">
                <strong className="text-xs sm:text-sm">Evaluation:</strong>
                <div className="flex-1 border-b border-black h-4 sm:h-5"></div>
            </div>
            <div className="w-full border-b border-black h-6 sm:h-8"></div>
        </div>
        
        {/* 📚 LESSON NOTES PREVIEW */}
        {notesData && (
             <div className="mt-8 pt-8 border-t-4 border-double border-slate-300 break-before-page">
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-t-lg flex items-center gap-2 sm:gap-3">
                    <BookOpen className="text-yellow-400 w-4 h-4 sm:w-6 sm:h-6" />
                    <h2 className="text-base sm:text-xl font-bold tracking-wide">LESSON NOTES (Blackboard)</h2>
                </div>
                <div className="bg-white border-x border-b border-slate-300 p-4 sm:p-6 rounded-b-lg shadow-sm font-sans text-slate-800 text-xs sm:text-sm">
                    
                    <h3 className="text-base sm:text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-center uppercase text-slate-900">
                        {notesData.topic_heading}
                    </h3>
                    
                    {notesData.key_definitions && notesData.key_definitions.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] sm:text-sm bg-slate-100 p-1 pl-2">Key Definitions</h4>
                            <ul className="space-y-3">
                                {notesData.key_definitions.map((def: any, i: number) => (
                                    <li key={i} className="pl-3 sm:pl-4 border-l-4 border-yellow-400">
                                        <span className="font-bold text-slate-900">{def.term}:</span> {def.definition}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {notesData.explanation_points && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] sm:text-sm bg-slate-100 p-1 pl-2">Explanation</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {notesData.explanation_points.map((pt: string, i: number) => (
                                    <li key={i}>{pt}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {/* Worked Examples */}
                    {notesData.worked_examples && notesData.worked_examples.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] sm:text-sm bg-slate-100 p-1 pl-2">Worked Examples</h4>
                            <div className="space-y-3">
                                {notesData.worked_examples.map((ex: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200">
                                        <p className="font-bold text-slate-800 mb-1">Example {i+1}:</p>
                                        <p className="mb-2">{ex.question}</p>
                                        <p className="text-slate-600 italic border-t pt-2 mt-2 border-slate-200">Solution: {ex.solution}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Class Exercise */}
                    {notesData.class_exercise && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] sm:text-sm bg-slate-100 p-1 pl-2">Class Exercise</h4>
                            <ol className="list-decimal pl-5 space-y-1">
                                {notesData.class_exercise.map((q: string, i: number) => (
                                    <li key={i}>{q}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Homework */}
                    {notesData.homework_question && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] sm:text-sm bg-slate-100 p-1 pl-2">Homework</h4>
                            <div className="p-3 border border-slate-200 rounded bg-slate-50">
                                {Array.isArray(notesData.homework_question) ? (
                                    <ul className="list-disc pl-5">
                                        {notesData.homework_question.map((q: string, i: number) => <li key={i}>{q}</li>)}
                                    </ul>
                                ) : (
                                    <p>{notesData.homework_question}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      {/* 🆕 MANAGE COLUMNS MODAL */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings2 size={20} className="text-indigo-600" /> Manage Columns
              </h3>
              <button onClick={() => setIsColumnModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {columns.map((col, index) => (
                <div key={index} className="flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:border-indigo-300 transition-all group">
                  <span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg font-black text-xs group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={col.label}
                    onChange={(e) => {
                      const newCols = [...columns];
                      newCols[index].label = e.target.value;
                      setColumns(newCols);
                    }}
                    className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 text-sm px-2"
                    placeholder="Column Name"
                  />
                  
                  <div className="flex gap-1">
                      <button 
                        disabled={index === 0}
                        onClick={() => {
                          const newCols = [...columns];
                          [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
                          setColumns(newCols);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 transition-all"
                      ><ArrowUp size={16} /></button>
                      <button 
                        disabled={index === columns.length - 1}
                        onClick={() => {
                          const newCols = [...columns];
                          [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
                          setColumns(newCols);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 transition-all"
                      ><ArrowDown size={16} /></button>

                      <button 
                        onClick={() => {
                          const newCols = [...columns];
                          const newKey = `custom_${Date.now()}`;
                          newCols.splice(index + 1, 0, { key: newKey, label: "NEW COLUMN" });
                          setColumns(newCols);
                        }}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      ><Plus size={16} /></button>

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
              <button onClick={handleAddColumn} className="w-full py-2.5 sm:py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all flex justify-center items-center gap-2">
                <Plus size={18} /> Add New Column at End
              </button>
              <button onClick={() => setIsColumnModalOpen(false)} className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98]">
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}