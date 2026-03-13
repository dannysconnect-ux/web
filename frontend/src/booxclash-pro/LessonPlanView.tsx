import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios'; 

import { db, auth } from './firebase'; 
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 

import LessonPlanHeader from './lessonplanviews/LessonPlanHeader';
import LessonPlanDocument from './lessonplanviews/LessonPlanDocument';
import ManageColumnsModal from './lessonplanviews/ManageColumnsModal';

// Import the CreditModal 
import CreditModal from './CreditWarningModal'; 

export const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg"; 
const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app');

export interface TableColumn {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'stage_time', label: 'STAGE / TIME' },
  { key: 'teacherActivity', label: 'TEACHER ACTIVITY' },
  { key: 'learnerActivity', label: 'LEARNER ACTIVITY' },
  { key: 'assessment_criteria', label: 'ASSESSMENT CRITERIA' }
];

export default function LessonPlanView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesData, setNotesData] = useState<any>(null);

  const { lessonData, meta, isLocked: passedLock, customColumns } = location.state || {};
  const schoolName = lessonData?.schoolName || meta?.school || "Primary School";
  
  const [planData, setPlanData] = useState<any>(lessonData);
  const [columns, setColumns] = useState<TableColumn[]>(DEFAULT_COLUMNS);
  const [isLocked, setIsLocked] = useState(false); 
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // =====================================================================
  // 🆕 LIFECYCLE STATE: DIAGRAMS, EVALUATION & REMEDIALS
  // =====================================================================
  const [diagramPrompt, setDiagramPrompt] = useState("");
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  
  // 🆕 State for the Credit Modal
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(null);

  const [generatingRemedial, setGeneratingRemedial] = useState(false);

  useEffect(() => {
    if (!planData || !meta) {
      navigate('/teacher-dashboard'); 
    } else {
      if (passedLock) setIsLocked(true);
      if (customColumns && Array.isArray(customColumns) && customColumns.length > 0) {
        setColumns(customColumns);
      }
    }
  }, [planData, meta, navigate, passedLock, customColumns]);

  if (!planData) return null; 

  const cleanSubtopic = (topic: string, subtopic: string) => {
      if (!subtopic || !topic) return subtopic;
      const normalizedTopic = topic.toLowerCase().trim();
      const normalizedSub = subtopic.toLowerCase().trim();
      
      if (normalizedSub.includes(normalizedTopic)) {
          return subtopic.replace(topic, "").replace(/\(Unit\s*\d+(\.\d+)*\)/i, "").trim() || subtopic;
      }
      return subtopic;
  };
  const displaySubtopic = cleanSubtopic(planData.topic, planData.subtopic);

  // =====================================================================
  // 🔄 LIFECYCLE API HANDLERS
  // =====================================================================
  
  // 1. First step: Validate and open the modal instead of calling the API
  const handleGenerateDiagramClick = () => {
    if (!diagramPrompt.trim()) {
      alert("Please enter a diagram prompt first.");
      return;
    }
    setIsDiagramModalOpen(true);
  };

  // 2. Second step: Actual API call when user clicks "Confirm" in the modal
  const confirmGenerateDiagram = async () => {
    setGeneratingDiagram(true);
    try {
      const response = await axios.post(`${API_BASE}/api/v1/new/generate-diagram`, {
        prompt: diagramPrompt,
        uid: auth.currentUser?.uid
      });
      
      // Changed to store 'base64' directly instead of 'svg'
      if (response.data && response.data.content) {
        const newDiagram = { prompt: diagramPrompt, base64: response.data.content };
        setPlanData((prev: any) => ({
          ...prev,
          diagrams: [...(prev.diagrams || []), newDiagram]
        }));
        setDiagramPrompt("");
      }
    } catch (error) {
      console.error("Error generating diagram:", error);
      alert("Failed to generate chalkboard diagram.");
    } finally {
      setGeneratingDiagram(false);
      setIsDiagramModalOpen(false); // Close the modal when done or on failure
    }
  };

  const handleEvaluateLesson = async () => {
    if (!evaluationFeedback.trim()) return;
    setEvaluating(true);
    try {
      const response = await axios.post(`${API_BASE}/api/v1/new/evaluate-lesson`, {
        grade: meta.grade,
        subject: meta.subject,
        topic: planData.topic,
        subtopic: displaySubtopic,
        feedback: evaluationFeedback,
        uid: auth.currentUser?.uid
      });
      
      if (response.data && response.data.data) {
        const aiAnalysis = response.data.data;
        setEvaluationData(aiAnalysis);

        // 1. Update the local planData state so the PDF and UI get the evaluation instantly
        setPlanData((prev: any) => ({
          ...prev,
          evaluation: evaluationFeedback,
          evaluation_footer: evaluationFeedback 
        }));

        // 2. Update Firestore to save the flag, the text, AND the AI's analysis
        const documentId = meta?.id || lessonData?.id; 
        if (documentId) {
          const planRef = doc(db, "generated_lesson_plans", documentId);
          await updateDoc(planRef, {
            isEvaluated: true,
            "planData.evaluation": evaluationFeedback,
            "planData.evaluation_footer": evaluationFeedback,
            evaluationAnalysis: aiAnalysis 
          });
        }
      }
    } catch (error) {
      console.error("Error evaluating lesson:", error);
      alert("Failed to analyze lesson feedback.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerateRemedial = async () => {
    setGeneratingRemedial(true);
    try {
      const response = await axios.post(`${API_BASE}/api/v1/new/generate-lesson-plan`, {
        uid: auth.currentUser?.uid,
        grade: meta.grade,
        subject: meta.subject,
        term: meta.term || "Term 1",
        school: schoolName,
        teacherName: planData.teacherName || meta.teacherName,
        topic: planData.topic,
        subtopic: displaySubtopic,
        weekNumber: meta.weekNumber || 1,
        date: new Date().toISOString().split('T')[0], 
        timeStart: "08:00",
        timeEnd: "08:40",
        boys: meta.boys || 0,
        girls: meta.girls || 0,
        objectives: [],
        schoolId: localStorage.getItem('schoolId'),
        schoolLogo: meta.schoolLogo,
        is_remedial: true,                         
        teacher_feedback: evaluationFeedback       
      });
      
      if (response.data && response.data.data) {
        setPlanData(response.data.data);
        setEvaluationData(null);
        setEvaluationFeedback("");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        alert("Remedial Lesson Plan Generated Successfully!");
      }
    } catch (error) {
      console.error("Error generating remedial lesson:", error);
      alert("Failed to generate remedial lesson.");
    } finally {
      setGeneratingRemedial(false);
    }
  };

  // =====================================================================
  // 📝 STANDARD EDITS & NOTES HANDLERS
  // =====================================================================

  const handleStepChange = (index: number, field: string, newValue: any) => {
    setPlanData((prev: any) => {
        const updatedSteps = [...(prev.steps || [])];
        updatedSteps[index] = { ...updatedSteps[index], [field]: newValue };
        return { ...prev, steps: updatedSteps };
    });
  };

  const handleFieldChange = (field: string, newValue: any) => {
      setPlanData((prev: any) => ({ ...prev, [field]: newValue }));
  };

  const handleDeleteRow = (index: number) => {
    setPlanData((prev: any) => {
        const updatedSteps = prev.steps.filter((_: any, i: number) => i !== index);
        return { ...prev, steps: updatedSteps };
    });
  };

  const handleInsertRow = (index: number) => {
    setPlanData((prev: any) => {
        const updatedSteps = [...(prev.steps || [])];
        updatedSteps.splice(index + 1, 0, { stage: "", time: "", teacherActivity: "", learnerActivity: "", assessment_criteria: "" });
        return { ...prev, steps: updatedSteps };
    });
  };

  const handleAddRowToBottom = () => {
    setPlanData((prev: any) => {
        const updatedSteps = [...(prev.steps || []), { stage: "", time: "", teacherActivity: "", learnerActivity: "", assessment_criteria: "" }];
        return { ...prev, steps: updatedSteps };
    });
  };

  const handleGenerateNotes = async () => {
    setGeneratingNotes(true);
    try {
        const endpoint = `${API_BASE}/api/v1/new/generate-lesson-notes`;
        const response = await axios.post(endpoint, {
            grade: meta.grade,
            subject: meta.subject,
            topic: planData.topic,
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
          uid: user.uid, planType: "lesson_plan", grade: meta.grade, subject: meta.subject, term: meta.term,
          weekNumber: meta.weekNumber || 1, schoolId: schoolId || null,
          finalEditedData: { ...planData, columns: columns, isLocked } 
        })
      }).catch(err => console.warn("Background moat capture failed:", err));
    } catch (e) { console.warn("Could not capture edits:", e); }
  };

  const handleSaveToCloud = async () => {
    if (!auth.currentUser) return alert("You must be logged in to save.");
    
    setSaving(true);
    captureEditsBackground();

    // 🚨 Check if it has been evaluated to clear out warnings
    const currentEval = planData.evaluation || planData.evaluation_footer || "";
    const isActuallyEvaluated = !!evaluationData || (currentEval.length > 10 && !currentEval.includes("........................"));

    try {
        await addDoc(collection(db, "generated_lesson_plans"), {
            userId: auth.currentUser.uid,
            ...meta, 
            school: schoolName,
            planData: planData, 
            notesData: notesData, 
            customColumns: columns, 
            isLocked: isLocked,
            isEvaluated: isActuallyEvaluated,
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

  // --- PDF GENERATOR ---
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
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = () => resolve(""); 
    });
  };

  const handleDownloadPDF = async () => {
    captureEditsBackground();

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); 
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    try {
        let logoData = "";
        if (meta.schoolLogo) logoData = await getBase64ImageFromURL(meta.schoolLogo);
        if (!logoData) logoData = await getBase64ImageFromURL(COAT_OF_ARMS_URL);
        if (logoData) {
            const imgWidth = 25, imgHeight = 25;
            const xPos = (pageWidth / 2) - (imgWidth / 2);
            doc.addImage(logoData, 'PNG', xPos, 10, imgWidth, imgHeight);
            yPos += 20; 
        }
    } catch (e) { console.error("Error rendering logo:", e); }

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    if (meta.schoolLogo) {
        doc.text(schoolName.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
    } else {
        doc.text("REPUBLIC OF ZAMBIA", pageWidth / 2, yPos, { align: "center" }); yPos += 6;
        doc.text("MINISTRY OF EDUCATION", pageWidth / 2, yPos, { align: "center" });
    }
    
    yPos += 10;
    doc.setFontSize(16);
    doc.text(`${(meta.subject || "SUBJECT").toUpperCase()} LESSON PLAN${planData.is_remedial_plan ? ' (REMEDIAL)' : ''}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    doc.setFontSize(11);
    doc.setFont("times", "normal");
    
    const cleanText = (text: any) => {
        if (!text) return "";
        let str = Array.isArray(text) ? text.map(t => (typeof t === 'object' ? "" : `• ${t}`)).join("\n") : String(text);
        return str.replace(/\*\*/g, "").replace(/#{1,6}\s?/g, "").trim();
    };
    const txt = (str: any) => cleanText(str);

    const boys = meta.boys || planData.enrolment?.boys || 0;
    const girls = meta.girls || planData.enrolment?.girls || 0;
    const total = parseInt(boys) + parseInt(girls);
    const displayDate = planData.date || meta.startDate || "..................";

    doc.text(`Name of Teacher: ${txt(planData.teacherName || meta.teacherName)}`, margin, yPos);
    doc.text(`Date: ${displayDate}`, pageWidth/2 + 5, yPos);
    yPos += 6;
    doc.text(`School: ${txt(schoolName)}`, margin, yPos);
    doc.text(`Time: ${txt(planData.time)}`, pageWidth/2 + 5, yPos);
    yPos += 6;
    doc.text(`Grade: ${txt(meta.grade)}`, margin, yPos);
    doc.text(`Duration: ${txt(planData.duration || "40 minutes")}`, pageWidth/2 + 5, yPos);
    yPos += 6;
    doc.text(`Subject: ${txt(meta.subject)}`, margin, yPos);
    doc.text(`Enrolment:  Boys: ${boys}   Girls: ${girls}   Total: ${total}`, pageWidth/2 + 5, yPos);
    
    yPos += 8;
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFont("times", "bold");
    doc.text(`Topic: ${txt(planData.topic || meta.topic)}`, margin, yPos);
    yPos += 6;
    doc.text(`Sub-topic: ${txt(displaySubtopic)}`, margin, yPos);
    yPos += 10;
    doc.setFont("times", "normal");

    const checkPageBreak = (heightNeeded: number) => {
        if (yPos + heightNeeded > 280) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    };

    const printDetailSection = (label: string, content: any) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return;
        doc.setFont("times", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("times", "normal");
        const splitText = doc.splitTextToSize(cleanText(content), contentWidth - 35);
        
        if (splitText.length === 1 && label.length < 20) {
            doc.text(splitText, margin + 40, yPos);
            yPos += 6;
        } else {
            yPos += 5;
            doc.text(splitText, margin + 5, yPos);
            yPos += (splitText.length * 5) + 4;
        }
        checkPageBreak(10);
    };

    printDetailSection("Expected Standard", planData.expected_standard);
    
    if (planData.rationale) {
        printDetailSection("Rationale", planData.rationale);
    }
    
    if (planData.learning_environment) {
         doc.setFont("times", "bold");
         doc.text("Learning Environment:", margin, yPos);
         yPos += 5;
         doc.setFont("times", "normal");
         const env = planData.learning_environment;
         const envText = `Natural: ${env.natural || '-'} | Tech: ${env.technological || '-'} | Artificial: ${env.artificial || '-'}`;
         doc.text(envText, margin + 5, yPos);
         yPos += 8;
    }

    printDetailSection("Teaching/Learning Aids", planData.materials);
    printDetailSection("References", planData.references);
    yPos += 2; 

    // DYNAMIC TABLE GENERATION
    const tableHeaders = [columns.map(col => col.label)];
    const stepsData = Array.isArray(planData.steps) ? planData.steps : [];
    
    const tableBody = stepsData.map((step: any) => {
        return columns.map(col => {
            if (col.key === 'stage_time') {
                return `${cleanText(step.stage)}\n(${cleanText(step.time)})`;
            }
            return cleanText(step[col.key]);
        });
    });

    autoTable(doc, {
        startY: yPos,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        styles: { font: "times", fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], overflow: 'linebreak', cellPadding: 3 },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        didDrawPage: (data) => { yPos = data.cursor?.y || yPos; }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    const printBlock = (title: string, content: string) => {
        if (!content) return;
        checkPageBreak(30);
        doc.setFont("times", "bold");
        doc.text(title.toUpperCase(), margin, yPos);
        yPos += 6;
        doc.setFont("times", "normal");
        const split = doc.splitTextToSize(cleanText(content), contentWidth);
        doc.text(split, margin, yPos);
        yPos += (split.length * 5) + 8;
    };

    printBlock("Homework", planData.homework || planData.homework_content);
    printBlock("Evaluation", planData.evaluation || planData.evaluation_footer || "..................................................................................");

    // =====================================================================
    // 🎨 DRAW DIAGRAMS INTO PDF (UPDATED FOR BASE64)
    // =====================================================================
    if (planData.diagrams && planData.diagrams.length > 0) {
      for (let i = 0; i < planData.diagrams.length; i++) {
          const diag = planData.diagrams[i];
          
          checkPageBreak(80); 
          yPos += 5;
          doc.setFont("times", "bold");
          doc.text(`DIAGRAM: ${diag.prompt.toUpperCase()}`, margin, yPos);
          yPos += 5;
          
          try {
              // Now we just use the Base64 data returned from Imagen directly
              const base64Data = diag.base64 || diag.content;
              
              if (base64Data) {
                  const imgWidth = contentWidth * 0.8; 
                  const imgHeight = (600 / 800) * imgWidth; 
                  const xOffset = margin + (contentWidth - imgWidth) / 2;

                  checkPageBreak(imgHeight + 10);
                  doc.addImage(base64Data, 'PNG', xOffset, yPos, imgWidth, imgHeight);
                  yPos += imgHeight + 10;
              }
          } catch (err) {
              console.error("Failed to render diagram to PDF", err);
          }
      }
    }

    // =====================================================================
    // 📚 LESSON NOTES PREVIEW IN PDF
    // =====================================================================
    if (notesData) {
        doc.addPage();
        yPos = 20;
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("LESSON NOTES (Blackboard)", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont("times", "normal");

        const printNoteSection = (title: string, content: any) => {
            if (!content) return;
            checkPageBreak(20);
            doc.setFont("times", "bold");
            doc.text(title.toUpperCase(), margin, yPos);
            yPos += 6;
            doc.setFont("times", "normal");

            if (Array.isArray(content)) {
                content.forEach(line => {
                    if (typeof line === 'object') {
                        const lineText = `${line.term ? line.term + ': ' : ''}${line.definition || line.question || ''}`;
                        const split = doc.splitTextToSize("• " + cleanText(lineText), contentWidth);
                        checkPageBreak(split.length * 5);
                        doc.text(split, margin, yPos);
                        yPos += (split.length * 5) + 2;
                        if(line.solution) {
                             const sol = doc.splitTextToSize("  Solution: " + cleanText(line.solution), contentWidth);
                             doc.text(sol, margin, yPos);
                             yPos += (sol.length * 5) + 2;
                        }
                    } else {
                        const split = doc.splitTextToSize("• " + cleanText(line), contentWidth);
                        checkPageBreak(split.length * 5);
                        doc.text(split, margin, yPos);
                        yPos += (split.length * 5) + 2;
                    }
                });
            } else {
                const split = doc.splitTextToSize(cleanText(content), contentWidth);
                checkPageBreak(split.length * 5);
                doc.text(split, margin, yPos);
                yPos += (split.length * 5);
            }
            yPos += 5;
        };

        printNoteSection("Topic", notesData.topic_heading);
        printNoteSection("Key Definitions", notesData.key_definitions);
        printNoteSection("Explanation", notesData.explanation_points);
        printNoteSection("Worked Examples", notesData.worked_examples);
        printNoteSection("Class Exercise", notesData.class_exercise);
        printNoteSection("Homework", notesData.homework_question);
    }

    doc.save(`LessonPlan_${(meta.subject || "Subject").substring(0,10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20 w-full overflow-x-hidden">
      
      <LessonPlanHeader 
        schoolName={schoolName}
        subject={meta.subject}
        generatingNotes={generatingNotes}
        hasNotes={!!notesData}
        isLocked={isLocked}
        saving={saving}
        saveSuccess={saveSuccess}
        isRemedial={planData.is_remedial_plan} 
        onBack={() => navigate('/teacher-dashboard')}
        onGenerateNotes={handleGenerateNotes}
        onOpenColumnModal={() => setIsColumnModalOpen(true)}
        onToggleLock={() => setIsLocked(!isLocked)}
        onSave={handleSaveToCloud}
        onPrint={handleDownloadPDF}
      />

      <LessonPlanDocument 
        planData={planData}
        meta={meta}
        schoolName={schoolName}
        columns={columns}
        displaySubtopic={displaySubtopic}
        notesData={notesData}
        coatOfArmsUrl={COAT_OF_ARMS_URL}
        
        handleFieldChange={handleFieldChange}
        handleStepChange={handleStepChange}
        handleInsertRow={handleInsertRow}
        handleDeleteRow={handleDeleteRow}
        handleAddRowToBottom={handleAddRowToBottom}
        
        diagramPrompt={diagramPrompt}
        setDiagramPrompt={setDiagramPrompt}
        generatingDiagram={generatingDiagram}
        onGenerateDiagram={handleGenerateDiagramClick}
        
        evaluationFeedback={evaluationFeedback}
        setEvaluationFeedback={setEvaluationFeedback}
        evaluating={evaluating}
        evaluationData={evaluationData}
        onEvaluateLesson={handleEvaluateLesson}
        generatingRemedial={generatingRemedial}
        onGenerateRemedial={handleGenerateRemedial}
      />

      {isColumnModalOpen && (
        <ManageColumnsModal 
          columns={columns}
          setColumns={setColumns}
          onClose={() => setIsColumnModalOpen(false)}
        />
      )}

      {/* 🆕 Inject the Warning Modal here! */}
      <CreditModal 
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        onConfirm={confirmGenerateDiagram}
        cost={5} 
        featureName="Chalkboard Diagram"
        isLoading={generatingDiagram}
      />

    </div>
  );
}