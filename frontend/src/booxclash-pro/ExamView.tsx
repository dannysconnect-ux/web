import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Printer, ChevronLeft, CheckCircle, FileSignature, 
    ImagePlus, Loader2, X, Edit2, Trash2, Plus, Upload 
} from 'lucide-react';
import jsPDF from 'jspdf';
import axios from 'axios';
import { auth } from './firebase'; 

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 

// Updated state to track 'url' or 'base64' (from Imagen or Manual Upload)
type ImageMeta = { type: 'url' | 'base64'; data: string };

export default function ExamView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { examData, meta } = location.state || {};

  const [localExamData, setLocalExamData] = useState<any>(examData || {});
  const [showAnswers, setShowAnswers] = useState(false);
  const [images, setImages] = useState<Record<string, ImageMeta>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  
  // Track which question is currently being edited
  const [editingQ, setEditingQ] = useState<{ sectionKey: string, qIdx: number } | null>(null);

  const examTitle = localExamData?.exam_title || `${meta?.grade} ${meta?.subject} Test`;

  useEffect(() => {
    if (!localExamData || Object.keys(localExamData).length === 0) navigate('/');
  }, [localExamData, navigate]);

  if (!localExamData || !meta) return null;

  const teacherName = meta?.teacherName || auth.currentUser?.displayName || "Teacher";
  const schoolName = meta?.school || "Primary School";
  const schoolLogo = meta?.schoolLogo || null; 

  // =====================================================================
  // 📚 BUILD ACTIVE SECTIONS ARRAY
  // =====================================================================
  const activeSections: any[] = [];
  if (localExamData.multiple_choice?.length) activeSections.push({ type: 'mcq', sectionKey: 'multiple_choice', title: 'Multiple Choice', data: localExamData.multiple_choice });
  if (localExamData.true_false?.length) activeSections.push({ type: 'tf', sectionKey: 'true_false', title: 'True or False', data: localExamData.true_false });
  if (localExamData.matching?.length) activeSections.push({ type: 'matching', sectionKey: 'matching', title: 'Matching Pairs', data: localExamData.matching });
  if (localExamData.short_answer?.length || localExamData.one_word?.length) {
      const key = localExamData.short_answer ? 'short_answer' : 'one_word';
      activeSections.push({ type: 'short', sectionKey: key, title: 'Short Answer', data: localExamData[key] });
  }
  if (localExamData.computational?.length) activeSections.push({ type: 'comp', sectionKey: 'computational', title: 'Problem Solving', data: localExamData.computational });
  if (localExamData.case_study?.length) activeSections.push({ type: 'case', sectionKey: 'case_study', title: 'Case Study', data: localExamData.case_study });
  if (localExamData.essay?.length) activeSections.push({ type: 'essay', sectionKey: 'essay', title: 'Essay / Long Answer', data: localExamData.essay });

  let currentGlobalQNum = 1;
  const sectionsWithMeta = activeSections.map((sec, idx) => {
      const startQ = currentGlobalQNum;
      
      // ✅ FIX: Added optional chaining (?.) and fallbacks (|| 0) to prevent undefined length crashes
      let count = sec.type === 'matching' 
          ? sec.data.reduce((sum: number, m: any) => sum + (m.pairs?.length || 0), 0)
          : sec.type === 'case' 
          ? sec.data.reduce((sum: number, cs: any) => sum + (cs.questions?.length || 0), 0)
          : (sec.data?.length || 0);
                
      currentGlobalQNum += count;
      return { ...sec, letter: String.fromCharCode(65 + idx), startQ };
  });

  // =====================================================================
  // ✏️ CRUD OPERATIONS (EDIT / ADD / REMOVE)
  // =====================================================================
  
  const handleUpdateQuestion = (sectionKey: string, qIdx: number, field: string, value: any) => {
      const updated = { ...localExamData };
      updated[sectionKey][qIdx][field] = value;
      setLocalExamData(updated);
  };

  const handleRemoveQuestion = (sectionKey: string, qIdx: number) => {
      if (!window.confirm("Delete this question?")) return;
      const updated = { ...localExamData };
      updated[sectionKey].splice(qIdx, 1);
      setLocalExamData(updated);
      if (editingQ?.sectionKey === sectionKey && editingQ?.qIdx === qIdx) setEditingQ(null);
  };

  const handleAddQuestion = (sectionKey: string, type: string) => {
      const updated = { ...localExamData };
      if (!updated[sectionKey]) updated[sectionKey] = [];
      
      let newQ: any = { question: "New Question Text...", points_allocated: 1 };
      
      if (type === 'mcq') newQ = { ...newQ, options: ["Option A", "Option B"], answer: "Option A" };
      else if (type === 'tf') newQ = { ...newQ, answer: "True" };
      else if (type === 'matching') newQ = { instruction: "Match items", pairs: [{ stem: "Item 1", match: "Match 1" }] };
      else if (type === 'comp') newQ = { ...newQ, solution_steps: "Steps here", final_answer: "0" };
      else if (type === 'case') newQ = { scenario: "New Scenario Text...", questions: [{ question: "Q1", answer: "A1", points_allocated: 1 }] };
      else if (type === 'essay') newQ = { ...newQ, grading_rubric: "Grading criteria here", points_allocated: 5 };
      else newQ = { ...newQ, answer: "Expected answer" }; 
      
      updated[sectionKey].push(newQ);
      setLocalExamData(updated);
      setEditingQ({ sectionKey, qIdx: updated[sectionKey].length - 1 });
  };

  // =====================================================================
  // 🖼️ GENERATE & UPLOAD DIAGRAM LOGIC
  // =====================================================================
  
  const handleGenerateImage = async (questionId: string, prompt: string) => {
    setLoadingImages(prev => ({ ...prev, [questionId]: true }));
    try {
        const res = await axios.post(`${API_BASE}/api/exams/generate-diagram`, {
            prompt: prompt,
            uid: auth.currentUser?.uid
        });
        
        const payload = res.data;
        if (payload?.status === 'success') {
            setImages(prev => ({ 
                ...prev, 
                [questionId]: { type: payload.type, data: payload.data } 
            }));
        } else {
            alert("Failed to find or generate a diagram.");
        }
    } catch (error) {
        console.error("Image generation error:", error);
        alert("Image generation failed. Please check your connection.");
    } finally {
        setLoadingImages(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64String = event.target?.result as string;
          setImages(prev => ({
              ...prev,
              [questionId]: { type: 'base64', data: base64String }
          }));
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };

  // =====================================================================
  // 🖨️ PDF IMAGE HELPERS & EXPORT LOGIC
  // =====================================================================
  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(""); 
      img.src = url;
    });
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 15; 

    const checkPageBreak = (heightNeeded: number) => {
        if (yPos + heightNeeded > 280) { doc.addPage(); yPos = 20; }
    };

    const drawPdfImageIfAny = async (qId: string) => {
        const imgData = images[qId];
        if (imgData) {
            try {
                const base64 = imgData.type === 'base64' 
                    ? imgData.data 
                    : await getBase64ImageFromURL(imgData.data);

                if (base64) {
                    checkPageBreak(50);
                    const imgW = 60, imgH = 60; 
                    doc.addImage(base64, 'PNG', (pageWidth / 2) - (imgW / 2), yPos, imgW, imgH, undefined, 'FAST');
                    yPos += imgH + 5;
                }
            } catch (e) { console.error("Failed to inject image to PDF", e); }
        }
    };

    // --- 1. HEADER ---
    try {
        let logoData = await getBase64ImageFromURL(schoolLogo || COAT_OF_ARMS_URL);
        if (logoData) {
            const imgW = 20, imgH = 20;
            doc.addImage(logoData, 'PNG', (pageWidth / 2) - (imgW / 2), yPos, imgW, imgH);
            yPos += 26; 
        }
    } catch (e) {}

    doc.setFont("times", "bold"); doc.setFontSize(16);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" }); yPos += 8;
    doc.setFontSize(14);
    doc.text(examTitle.toUpperCase(), pageWidth / 2, yPos, { align: "center" }); yPos += 6;
    doc.setFontSize(11);
    doc.text(`${meta.term} • ${meta.grade} • ${meta.subject}`, pageWidth / 2, yPos, { align: "center" }); yPos += 8;

    if (!showAnswers) {
        doc.setFontSize(10); doc.setFont("times", "normal");
        doc.text("Student Name: __________________________________________________", margin, yPos);
        doc.text("Date: ____________________", pageWidth - margin - 50, yPos);
        yPos += 10;
    } else {
        doc.setTextColor(220, 38, 38); 
        doc.text("TEACHER ANSWER KEY", pageWidth / 2, yPos, { align: "center" });
        doc.setTextColor(0, 0, 0); yPos += 10;
    }
    
    doc.setLineWidth(0.5); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 10;

    // --- 2. ASYNC SECTIONS LOOP ---
    for (const section of sectionsWithMeta) {
        checkPageBreak(20); yPos += 5;
        doc.setFont("times", "bold"); doc.setFontSize(11);
        doc.text(`SECTION ${section.letter}: ${section.title.toUpperCase()}`, margin, yPos); yPos += 8;
        doc.setFont("times", "normal");

        let qNum = section.startQ;

        for (let i = 0; i < section.data.length; i++) {
            const q = section.data[i];

            if (section.type === 'mcq') {
                checkPageBreak(30);
                const splitQ = doc.splitTextToSize(`${qNum}. ${q.question}`, pageWidth - (margin * 2));
                doc.text(splitQ, margin, yPos); yPos += (splitQ.length * 6) + 2;
                
                await drawPdfImageIfAny(`${section.type}_${i}`); 

                // ✅ FIX: Added fallback for q.options
                (q.options || []).forEach((opt: string) => {
                    checkPageBreak(10);
                    const isCorrect = showAnswers && opt.startsWith(q.answer);
                    if (isCorrect) doc.setFont("times", "bold");
                    doc.text(opt, margin + 5, yPos);
                    if (isCorrect) doc.setFont("times", "normal");
                    yPos += 6;
                });
                yPos += 4; qNum++;
            } 
            else if (section.type === 'tf') {
                checkPageBreak(15);
                const splitQ = doc.splitTextToSize(`${qNum}. ${q.question}`, pageWidth - (margin * 2));
                doc.text(splitQ, margin, yPos); yPos += (splitQ.length * 6) + 2;
                await drawPdfImageIfAny(`${section.type}_${i}`);

                if (showAnswers) {
                    doc.setFont("times", "italic"); doc.setTextColor(16, 185, 129);
                    doc.text(`Answer: ${q.answer}`, margin + 5, yPos);
                    doc.setTextColor(0, 0, 0); doc.setFont("times", "normal");
                } else {
                    doc.text("[   ] True       [   ] False", margin + 5, yPos);
                }
                yPos += 8; qNum++;
            }
            else if (section.type === 'matching') {
                checkPageBreak(40);
                doc.setFont("times", "italic");
                const splitInst = doc.splitTextToSize(`Instruction: ${q.instruction || ''}`, pageWidth - (margin * 2));
                doc.text(splitInst, margin, yPos); yPos += (splitInst.length * 6) + 4;
                doc.setFont("times", "normal");
                await drawPdfImageIfAny(`${section.type}_${i}`);

                // ✅ FIX: Added fallback for q.pairs
                const safePairs = q.pairs || [];
                const sortedMatches = [...safePairs].sort((a,b) => (a.match || '').localeCompare(b.match || ''));
                
                safePairs.forEach((pair: any, pIdx: number) => {
                    checkPageBreak(10);
                    if (showAnswers) {
                        const correctMatchIndex = sortedMatches.findIndex(m => m.match === pair.match);
                        doc.setTextColor(16, 185, 129);
                        doc.text(`[ ${String.fromCharCode(65 + correctMatchIndex)} ] ${qNum}. ${pair.stem}`, margin, yPos);
                        doc.setTextColor(0, 0, 0);
                    } else {
                        doc.text(`[    ] ${qNum}. ${pair.stem}`, margin, yPos);
                    }
                    const splitMatch = doc.splitTextToSize(`${String.fromCharCode(65 + pIdx)}. ${sortedMatches[pIdx]?.match || ''}`, (pageWidth/2) - margin);
                    doc.text(splitMatch, pageWidth / 2, yPos);
                    yPos += Math.max(1, splitMatch.length) * 6; qNum++;
                });
                yPos += 5;
            }
            else if (section.type === 'short') {
                checkPageBreak(20);
                const splitQ = doc.splitTextToSize(`${qNum}. ${q.question}`, pageWidth - (margin * 2));
                doc.text(splitQ, margin, yPos); yPos += (splitQ.length * 6) + 2;
                await drawPdfImageIfAny(`${section.type}_${i}`);

                if (showAnswers) {
                    doc.setFont("times", "italic"); doc.setTextColor(16, 185, 129);
                    doc.text(`Answer: ${q.answer}`, margin + 5, yPos);
                    doc.setTextColor(0, 0, 0); doc.setFont("times", "normal"); yPos += 8;
                } else {
                    doc.setDrawColor(150); doc.setLineDashPattern([1, 1], 0);
                    doc.line(margin + 5, yPos, pageWidth - margin, yPos); 
                    doc.line(margin + 5, yPos + 8, pageWidth - margin, yPos + 8); 
                    doc.setLineDashPattern([], 0); yPos += 16;
                }
                qNum++;
            }
            else if (section.type === 'comp') {
                checkPageBreak(40);
                const splitQ = doc.splitTextToSize(`${qNum}. ${q.question}`, pageWidth - (margin * 2));
                doc.text(splitQ, margin, yPos); yPos += (splitQ.length * 6) + 2;
                await drawPdfImageIfAny(`${section.type}_${i}`);

                if (showAnswers) {
                    doc.setTextColor(16, 185, 129);
                    const stepsClean = (q.solution_steps || "").split('\n');
                    stepsClean.forEach((step: string) => {
                        const splitStep = doc.splitTextToSize(step, pageWidth - (margin * 2) - 10);
                        doc.text(splitStep, margin + 5, yPos); yPos += (splitStep.length * 6);
                    });
                    yPos += 4; doc.setFont("times", "bold");
                    doc.text(`Final Answer: ${q.final_answer}`, margin + 5, yPos);
                    doc.setFont("times", "normal"); doc.setTextColor(0, 0, 0); yPos += 10;
                } else {
                    yPos += 40; doc.setDrawColor(150); doc.setLineDashPattern([1, 1], 0);
                    doc.line(margin + 5, yPos, margin + 60, yPos); doc.setLineDashPattern([], 0);
                    doc.setFontSize(9); doc.text("Final Answer", margin + 5, yPos + 5);
                    doc.setFontSize(11); yPos += 15;
                }
                qNum++;
            }
            else if (section.type === 'case') {
                checkPageBreak(40);
                doc.setFillColor(248, 250, 252); doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
                const splitScen = doc.splitTextToSize(`Scenario: ${q.scenario}`, pageWidth - (margin * 2) - 6);
                const boxH = (splitScen.length * 6) + 6;
                doc.rect(margin, yPos, pageWidth - (margin*2), boxH, 'FD');
                doc.text(splitScen, margin + 3, yPos + 6); yPos += boxH + 8;
                await drawPdfImageIfAny(`${section.type}_scenario_${i}`);

                for (let qIdx = 0; qIdx < (q.questions || []).length; qIdx++) {
                    const sq = q.questions[qIdx];
                    checkPageBreak(20);
                    const splitQ = doc.splitTextToSize(`${qNum}. ${sq.question}`, pageWidth - (margin * 2) - 5);
                    doc.text(splitQ, margin + 5, yPos); yPos += (splitQ.length * 6) + 2;
                    await drawPdfImageIfAny(`${section.type}_${i}_q_${qIdx}`);

                    if (showAnswers) {
                        doc.setFont("times", "italic"); doc.setTextColor(16, 185, 129);
                        const splitA = doc.splitTextToSize(`Answer: ${sq.answer}`, pageWidth - (margin * 2) - 10);
                        doc.text(splitA, margin + 10, yPos); doc.setTextColor(0, 0, 0); doc.setFont("times", "normal");
                        yPos += (splitA.length * 6) + 6;
                    } else {
                        doc.setDrawColor(150); doc.setLineDashPattern([1, 1], 0);
                        doc.line(margin + 10, yPos, pageWidth - margin, yPos); yPos += 8;
                        doc.line(margin + 10, yPos, pageWidth - margin, yPos); yPos += 8;
                        doc.setLineDashPattern([], 0);
                    }
                    qNum++;
                }
                yPos += 5;
            }
            else if (section.type === 'essay') {
                checkPageBreak(40);
                doc.setFont("times", "bold");
                doc.text(`[${q.points_allocated || 5} marks]`, pageWidth - margin - 20, yPos); doc.setFont("times", "normal");
                const splitQ = doc.splitTextToSize(`${qNum}. ${q.question}`, pageWidth - (margin * 2) - 25);
                doc.text(splitQ, margin, yPos); yPos += (splitQ.length * 6) + 4;
                await drawPdfImageIfAny(`${section.type}_${i}`);

                if (showAnswers) {
                    doc.setFontSize(9);
                    const splitRubric = doc.splitTextToSize(`Rubric: ${q.grading_rubric}`, pageWidth - (margin * 2) - 10);
                    doc.text(splitRubric, margin + 5, yPos); doc.setFontSize(11);
                    yPos += (splitRubric.length * 5) + 10;
                } else {
                    doc.setDrawColor(150); doc.setLineDashPattern([1, 1], 0);
                    for(let x=0; x<8; x++) { doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 8; }
                    doc.setLineDashPattern([], 0); yPos += 5;
                }
                qNum++;
            }
        }
    }

    doc.setFont("times", "italic"); doc.setFontSize(9);
    doc.text(`End of Test • Created by ${teacherName}`, pageWidth / 2, yPos + 10, { align: "center" });
    doc.save(`${meta.grade}_${meta.subject}_Test.pdf`);
    setIsExporting(false);
  };

  // =====================================================================
  // 🎨 REACT UI RENDERERS
  // =====================================================================
  
  const renderImageTools = (q: any, qId: string) => {
    const aiSuggested = q.needs_image === true || q.needs_image === "true";
    const defaultPrompt = q.image_prompt || q.question || q.scenario || "Diagram";

    return (
        <div className="relative group/img-tools">
            {!images[qId] && (
                <div className={`ml-6 mt-2 print:hidden transition-all duration-300 ${
                    aiSuggested ? 'opacity-100 block' : 'opacity-0 h-0 overflow-hidden group-hover/tool:opacity-100 group-hover/tool:h-auto group-hover/tool:block group-hover/subtool:opacity-100 group-hover/subtool:h-auto group-hover/subtool:block'
                }`}>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => handleGenerateImage(qId, defaultPrompt)}
                            disabled={loadingImages[qId]}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                                aiSuggested ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                            {loadingImages[qId] ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                            {loadingImages[qId] ? "Searching..." : aiSuggested ? `Generate Diagram (${q.image_prompt})` : "Generate Diagram"}
                        </button>
                        
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg cursor-pointer transition-colors">
                            <Upload size={14} /> Upload Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, qId)} />
                        </label>
                    </div>
                </div>
            )}
            {images[qId] && (
                <div className="ml-6 mt-3 mb-4 print:ml-0 print:mt-4 print:mb-4 flex flex-col items-start relative group/img">
                    <button 
                        onClick={() => setImages(prev => { const copy = {...prev}; delete copy[qId]; return copy; })}
                        className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 print:hidden opacity-0 group-hover/img:opacity-100 transition-opacity z-10 shadow-sm"
                        title="Remove Image"
                    ><X size={14} /></button>
                    
                    <img 
                        src={images[qId].data} 
                        alt="Exam Diagram" 
                        className="w-48 sm:w-64 max-h-64 object-contain rounded border-2 border-slate-200 print:border-none" 
                    />
                </div>
            )}
        </div>
    );
  };

  // Helper to render the edit/delete buttons
  const renderActionButtons = (sectionKey: string, qIdx: number, isEditing: boolean) => (
      <div className="absolute top-2 right-2 opacity-0 group-hover/tool:opacity-100 transition-opacity flex gap-2 print:hidden z-10">
          <button onClick={() => setEditingQ(isEditing ? null : { sectionKey, qIdx })} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title={isEditing ? "Done Editing" : "Edit Question"}>
              {isEditing ? <CheckCircle size={16} /> : <Edit2 size={16} />}
          </button>
          <button onClick={() => handleRemoveQuestion(sectionKey, qIdx)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Delete Question">
              <Trash2 size={16} />
          </button>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 print:bg-white print:pb-0 flex flex-col items-center">
      
      {/* 🛠️ TOP TOOLBAR */}
      <div className="w-full bg-white border-b border-slate-200 p-4 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-[210mm] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft size={20} /></button>
            <div>
              <h2 className="font-bold flex items-center gap-2 text-slate-800"><FileSignature size={18} className="text-indigo-600" /> Test Generated Successfully</h2>
              <p className="text-xs text-slate-500">{meta.grade} • {meta.subject}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setShowAnswers(!showAnswers)} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border text-sm ${
                showAnswers ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCircle size={16} /> {showAnswers ? "Hide Answer Key" : "Show Answer Key"}
            </button>
            <button disabled={isExporting} onClick={handleDownloadPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shadow-md text-sm disabled:opacity-50">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} {isExporting ? "Exporting..." : "Export to PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* 📄 A4 PAPER CONTAINER */}
      <div className="w-full max-w-[210mm] bg-white sm:min-h-[297mm] sm:my-8 p-6 sm:p-12 sm:shadow-2xl rounded-sm print:m-0 print:p-0 print:shadow-none print:w-full font-serif">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center relative">
          <img src={schoolLogo || COAT_OF_ARMS_URL} alt="School Logo" className="mx-auto h-16 w-16 sm:h-20 sm:w-20 object-contain mb-2" />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 mb-1">{schoolName}</h1>
          <h2 className="text-lg font-bold text-slate-800 uppercase underline decoration-1 underline-offset-4 mb-1">{examTitle}</h2>
          <p className="text-sm text-slate-700 font-medium">{meta.term} • {meta.grade} • {meta.subject}</p>
          
          {showAnswers && <div className="absolute right-0 top-0 border-2 border-rose-500 text-rose-600 font-bold px-3 py-1 rounded-md uppercase tracking-widest text-xs print:text-black print:border-black">Teacher Answer Key</div>}

          {!showAnswers && (
            <div className="flex justify-between items-end mt-6 text-left text-sm font-medium">
              <div className="flex-1 mr-8 flex items-end"><span className="mr-2 whitespace-nowrap">Student Name:</span><div className="border-b border-slate-400 flex-1 border-dotted"></div></div>
              <div className="w-40 flex items-end"><span className="mr-2">Date:</span><div className="border-b border-slate-400 flex-1 border-dotted"></div></div>
            </div>
          )}
        </div>

        <div className="space-y-10 text-sm sm:text-base">
            {sectionsWithMeta.map((section) => {
                let qNumReact = section.startQ;
                return (
                    <section key={section.type} className="pt-2">
                        <h3 className="font-bold text-slate-900 uppercase tracking-wide mb-5">Section {section.letter}: {section.title}</h3>
                        <div className="space-y-6">
                            
                            {section.type === 'mcq' && section.data.map((q: any, i: number) => {
                                const currentQ = qNumReact++;
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className={`break-inside-avoid relative group/tool transition-colors ${isEditing ? 'bg-blue-50/50 p-4 rounded-xl border border-blue-200' : 'hover:bg-slate-50 p-2 -mx-2 rounded-lg'}`}>
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Edit Question</label>
                                            <textarea className="w-full border p-2 rounded outline-none" rows={2} value={q.question} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'question', e.target.value)} />
                                            <label className="text-xs font-bold text-blue-800 uppercase">Correct Answer</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={q.answer} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'answer', e.target.value)} />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-slate-900 flex gap-2 pr-12"><span>{currentQ}.</span><span>{q.question}</span></p>
                                            {renderImageTools(q, `${section.type}_${i}`)}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6 mt-2">
                                                {q.options?.map((opt: string, oIdx: number) => (
                                                    <div key={oIdx} className={`p-1.5 rounded ${showAnswers && opt.startsWith(q.answer) ? 'bg-emerald-50 font-bold text-emerald-800 outline outline-1 outline-emerald-400 print:outline-none print:font-bold print:text-black' : 'text-slate-800'}`}>{opt}</div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )})}

                            {section.type === 'tf' && section.data.map((q: any, i: number) => {
                                const currentQ = qNumReact++;
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className={`break-inside-avoid relative group/tool transition-colors ${isEditing ? 'bg-blue-50/50 p-4 rounded-xl border border-blue-200' : 'hover:bg-slate-50 p-2 -mx-2 rounded-lg'}`}>
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Edit Statement</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={q.question} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'question', e.target.value)} />
                                            <label className="text-xs font-bold text-blue-800 uppercase">Answer (True/False)</label>
                                            <select className="w-full border p-2 rounded outline-none" value={q.answer} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'answer', e.target.value)}>
                                                <option value="True">True</option><option value="False">False</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-slate-900 flex gap-2 pr-12"><span>{currentQ}.</span><span>{q.question}</span></p>
                                            {renderImageTools(q, `${section.type}_${i}`)}
                                            <div className="flex gap-6 pl-6 mt-2">
                                                <label className={`flex items-center gap-2 ${showAnswers && q.answer === 'True' ? 'text-emerald-700 font-bold print:text-black' : 'text-slate-700'}`}><div className={`w-3 h-3 border rounded-full ${showAnswers && q.answer === 'True' ? 'border-emerald-500 bg-emerald-100 print:border-black' : 'border-slate-400'}`}></div> True</label>
                                                <label className={`flex items-center gap-2 ${showAnswers && q.answer === 'False' ? 'text-emerald-700 font-bold print:text-black' : 'text-slate-700'}`}><div className={`w-3 h-3 border rounded-full ${showAnswers && q.answer === 'False' ? 'border-emerald-500 bg-emerald-100 print:border-black' : 'border-slate-400'}`}></div> False</label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )})}

                            {section.type === 'matching' && section.data.map((block: any, i: number) => {
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                
                                // ✅ FIX: Added optional chaining and fallback for rendering
                                const safePairs = block.pairs || [];
                                const sortedMatches = [...safePairs].sort((a,b) => (a.match || '').localeCompare(b.match || ''));
                                
                                return (
                                <div key={i} className="break-inside-avoid relative bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-none print:p-0 group/tool">
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Instructions</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={block.instruction} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'instruction', e.target.value)} />
                                            <p className="text-xs text-slate-500">Note: Deeper pair editing coming soon. Delete and recreate to change pairs.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="italic text-slate-700 mb-4 pr-12">{block.instruction}</p>
                                            {renderImageTools(block, `${section.type}_${i}`)}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="space-y-4 pr-4 border-r border-slate-200 print:border-transparent">
                                                    {safePairs.map((pair: any, pIdx: number) => {
                                                        const currentQ = qNumReact++;
                                                        const correctMatchIndex = sortedMatches.findIndex(m => m.match === pair.match);
                                                        return <div key={pIdx} className="flex items-center gap-3">{showAnswers ? <span className="text-emerald-600 font-bold w-6 text-center print:text-black">[{String.fromCharCode(65 + correctMatchIndex)}]</span> : <span className="border-b border-slate-400 w-6 inline-block"></span>}<span>{currentQ}. {pair.stem}</span></div>;
                                                    })}
                                                </div>
                                                <div className="space-y-4 pl-2">
                                                    {sortedMatches.map((m, mIdx) => <div key={mIdx} className="flex items-start gap-2"><span className="font-bold">{String.fromCharCode(65 + mIdx)}.</span><span>{m.match}</span></div>)}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )})}

                            {section.type === 'short' && section.data.map((q: any, i: number) => {
                                const currentQ = qNumReact++;
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className={`break-inside-avoid relative group/tool transition-colors ${isEditing ? 'bg-blue-50/50 p-4 rounded-xl border border-blue-200' : 'hover:bg-slate-50 p-2 -mx-2 rounded-lg'}`}>
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Question Text</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={q.question} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'question', e.target.value)} />
                                            <label className="text-xs font-bold text-blue-800 uppercase">Expected Answer</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={q.answer} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'answer', e.target.value)} />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-slate-900 flex gap-2 pr-12"><span>{currentQ}.</span><span>{q.question}</span></p>
                                            {renderImageTools(q, `${section.type}_${i}`)}
                                            {showAnswers ? <div className="pl-6 text-emerald-700 font-bold italic print:text-black mt-2">Answer: {q.answer}</div> : <div className="pl-6 space-y-4 pt-2"><div className="border-b border-slate-400 w-full border-dotted"></div><div className="border-b border-slate-400 w-full border-dotted"></div></div>}
                                        </>
                                    )}
                                </div>
                            )})}

                            {section.type === 'comp' && section.data.map((q: any, i: number) => {
                                const currentQ = qNumReact++;
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className={`break-inside-avoid relative group/tool transition-colors ${isEditing ? 'bg-blue-50/50 p-4 rounded-xl border border-blue-200' : 'hover:bg-slate-50 p-2 -mx-2 rounded-lg'}`}>
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Problem Text</label>
                                            <textarea className="w-full border p-2 rounded outline-none" rows={2} value={q.question} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'question', e.target.value)} />
                                            <label className="text-xs font-bold text-blue-800 uppercase">Final Answer</label>
                                            <input type="text" className="w-full border p-2 rounded outline-none" value={q.final_answer} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'final_answer', e.target.value)} />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-slate-900 flex gap-2 pr-12"><span>{currentQ}.</span><span>{q.question}</span></p>
                                            {renderImageTools(q, `${section.type}_${i}`)}
                                            {showAnswers ? <div className="pl-6 mt-3"><div className="bg-slate-50 p-4 border border-slate-200 rounded text-sm mb-3 whitespace-pre-wrap print:border-none print:p-0 text-emerald-800 print:text-black"><span className="font-bold text-slate-800 mb-1 block">Working / Steps:</span>{q.solution_steps}</div><p className="font-bold text-emerald-700 text-lg print:text-black">Answer: {q.final_answer}</p></div> : <div className="pl-6 space-y-12 mt-4"><div className="h-24"></div><div className="border-b border-slate-400 w-64 border-dotted mt-8"></div><p className="text-xs text-slate-500 mt-1">Final Answer</p></div>}
                                        </>
                                    )}
                                </div>
                            )})}

                            {section.type === 'case' && section.data.map((cs: any, i: number) => {
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className="break-inside-avoid relative group/tool mb-8">
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    
                                    {isEditing ? (
                                        <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-lg mb-6 space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Scenario Background</label>
                                            <textarea className="w-full border p-2 rounded outline-none text-sm" rows={4} value={cs.scenario} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'scenario', e.target.value)} />
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 p-4 sm:p-6 rounded-lg mb-6 text-sm leading-relaxed print:border-slate-400 pr-12">
                                            <span className="font-bold uppercase text-xs text-slate-500 mb-2 block tracking-widest">Scenario</span>{cs.scenario}
                                        </div>
                                    )}
                                    {renderImageTools(cs, `${section.type}_scenario_${i}`)}
                                    
                                    <div className="space-y-6 pl-4 border-l-2 border-slate-200 print:border-transparent">
                                        {/* ✅ FIX: Added fallback for cs.questions */}
                                        {(cs.questions || []).map((q: any, qIdx: number) => {
                                            const currentQ = qNumReact++;
                                            return <div key={qIdx} className="group/subtool">
                                                <p className="font-semibold text-slate-900 flex gap-2"><span>{currentQ}.</span><span>{q.question}</span></p>
                                                {renderImageTools(q, `${section.type}_${i}_q_${qIdx}`)}
                                                {showAnswers ? <div className="pl-6 text-emerald-700 font-bold italic print:text-black mt-2">Answer: {q.answer}</div> : <div className="pl-6 space-y-4 pt-2"><div className="border-b border-slate-400 w-full border-dotted"></div><div className="border-b border-slate-400 w-full border-dotted"></div></div>}
                                            </div>
                                        })}
                                    </div>
                                </div>
                            )})}

                            {section.type === 'essay' && section.data.map((q: any, i: number) => {
                                const currentQ = qNumReact++;
                                const isEditing = editingQ?.sectionKey === section.sectionKey && editingQ?.qIdx === i;
                                return (
                                <div key={i} className={`break-inside-avoid relative group/tool transition-colors ${isEditing ? 'bg-blue-50/50 p-4 rounded-xl border border-blue-200' : 'hover:bg-slate-50 p-2 -mx-2 rounded-lg'}`}>
                                    {renderActionButtons(section.sectionKey, i, isEditing)}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-blue-800 uppercase">Essay Prompt</label>
                                            <textarea className="w-full border p-2 rounded outline-none" rows={3} value={q.question} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'question', e.target.value)} />
                                            <label className="text-xs font-bold text-blue-800 uppercase">Grading Rubric</label>
                                            <textarea className="w-full border p-2 rounded outline-none" rows={2} value={q.grading_rubric} onChange={(e) => handleUpdateQuestion(section.sectionKey, i, 'grading_rubric', e.target.value)} />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start gap-4 pr-10">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900 flex gap-2"><span>{currentQ}.</span><span>{q.question}</span></p>
                                                    {renderImageTools(q, `${section.type}_${i}`)}
                                                </div>
                                                <span className="font-bold text-slate-600 whitespace-nowrap text-sm mt-0.5 print:text-black">[{q.points_allocated || 5} marks]</span>
                                            </div>
                                            {showAnswers ? <div className="pl-6 mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-sm print:bg-transparent print:border-black print:rounded-none"><p className="font-bold text-slate-800 mb-1">Grading Rubric:</p><p className="text-emerald-800 whitespace-pre-wrap print:text-black">{q.grading_rubric}</p></div> : <div className="pl-6 space-y-7 mt-4">{Array.from({ length: 8 }).map((_, lineIdx) => <div key={lineIdx} className="border-b border-slate-400 w-full border-dotted print:border-black"></div>)}</div>}
                                        </>
                                    )}
                                </div>
                            )})}

                            {/* ADD NEW QUESTION BUTTON FOR EACH SECTION */}
                            <button 
                                onClick={() => handleAddQuestion(section.sectionKey, section.type)}
                                className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-colors flex justify-center items-center gap-2 print:hidden mt-4"
                            >
                                <Plus size={18} /> Add Blank Question to {section.title}
                            </button>

                        </div>
                    </section>
                );
            })}
        </div>
        
        <div className="mt-12 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 uppercase tracking-widest print:mt-10">
            --- END OF EXAMINATION ---
        </div>
      </div>
    </div>
  );
}