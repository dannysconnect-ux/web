import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, PlusCircle, BookOpen, 
  PenTool, Sparkles, Loader2, RefreshCcw, Image as ImageIcon 
} from 'lucide-react';
import { TableColumn } from '../LessonPlanView';

// =====================================================================
// 🛠️ EDITABLE CELL HELPER (UPGRADED WITH AUTO-RESIZE)
// =====================================================================
const toSafeArray = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split('\n');
  return [String(val)];
};

const EditableArrayCell = ({ value, onChange, isArray = false, className = "", placeholder = "" }: any) => {
  const [localValue, setLocalValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(isArray ? toSafeArray(value).join("\n") : String(value || ""));
  }, [value, isArray]);

  // 🪄 THE MAGIC: Auto-resize the height based on scrollHeight
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height briefly
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Expand to fit content
    }
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (isArray) {
      onChange(localValue.split("\n"));
    } else {
      onChange(localValue);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      rows={1} // Start small, let the useEffect scale it up
      className={`w-full overflow-hidden min-h-[60px] md:min-h-[40px] p-2 md:p-1 bg-transparent border border-transparent md:hover:border-slate-200 focus:border-blue-400 focus:bg-blue-50/50 outline-none resize-none transition-all rounded print:resize-none print:border-none print:p-0 ${className}`}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
};

// =====================================================================
// 📄 DOCUMENT COMPONENT
// =====================================================================
interface LessonPlanDocumentProps {
  planData: any;
  meta: any;
  schoolName: string;
  columns: TableColumn[];
  displaySubtopic: string;
  notesData: any;
  coatOfArmsUrl: string;
  
  // Standard Edit Handlers
  handleFieldChange: (field: string, val: any) => void;
  handleStepChange: (index: number, field: string, val: any) => void;
  handleInsertRow: (index: number) => void;
  handleDeleteRow: (index: number) => void;
  handleAddRowToBottom: () => void;

  // Lifecycle Handlers
  diagramPrompt: string;
  setDiagramPrompt: (val: string) => void;
  generatingDiagram: boolean;
  onGenerateDiagram: () => void;
  evaluationFeedback: string;
  setEvaluationFeedback: (val: string) => void;
  evaluating: boolean;
  evaluationData: any;
  onEvaluateLesson: () => void;
  generatingRemedial: boolean;
  onGenerateRemedial: () => void;
}

export default function LessonPlanDocument({
  planData, meta, schoolName, columns, displaySubtopic, notesData, coatOfArmsUrl,
  handleFieldChange, handleStepChange, handleInsertRow, handleDeleteRow, handleAddRowToBottom,
  diagramPrompt, setDiagramPrompt, generatingDiagram, onGenerateDiagram,
  evaluationFeedback, setEvaluationFeedback, evaluating, evaluationData, onEvaluateLesson,
  generatingRemedial, onGenerateRemedial
}: LessonPlanDocumentProps) {

  const renderEditableBlock = (label: string, field: string, content: any, isArray: boolean = false) => {
    return (
       <div className="mb-3">
            <strong className="block text-slate-800 mb-1">{label}:</strong>
            <div className="bg-slate-50 md:bg-transparent rounded-lg md:rounded-none overflow-hidden">
               <EditableArrayCell
                   value={content}
                   isArray={isArray}
                   onChange={(val: any) => handleFieldChange(field, val)}
               />
            </div>
       </div>
    );
 };

  return (
    <>
      <div className="max-w-[210mm] mx-auto mt-4 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/50 p-2 rounded print:hidden">
         Click any field below to edit your lesson plan directly
      </div>

      <div className="w-full md:max-w-[210mm] mx-auto mt-2 sm:mt-4 bg-white md:shadow-2xl p-4 sm:p-8 md:p-[20mm] md:min-h-[297mm] text-black font-serif text-[10pt] sm:text-[11pt] leading-snug">
        
        {/* Header */}
        <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
                {meta.schoolLogo ? (
                    <img src={meta.schoolLogo} alt="School Logo" className="h-16 w-16 sm:h-20 sm:w-20 object-contain" />
                ) : (
                    <img src={coatOfArmsUrl} alt="Coat of Arms" className="h-16 w-16 sm:h-20 sm:w-20 object-contain" />
                )}
            </div>
            
            {!meta.schoolLogo && (
                <>
                    <h2 className="text-lg sm:text-xl font-bold">REPUBLIC OF ZAMBIA</h2>
                    <h3 className="text-base sm:text-lg font-bold">MINISTRY OF EDUCATION</h3>
                </>
            )}
            {meta.schoolLogo && (
                <h2 className="text-lg sm:text-xl font-bold uppercase">{schoolName}</h2>
            )}

            <h3 className="text-base sm:text-lg font-bold uppercase underline decoration-1 underline-offset-4 mt-4">
                {meta.subject} LESSON PLAN {planData.is_remedial_plan ? "(REMEDIAL)" : ""}
            </h3>
        </div>

        {/* 🛠️ Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 md:gap-y-1 mb-4 text-sm">
            <p className="flex md:block flex-wrap items-center"><strong>Name of Teacher:</strong> <span className="ml-1 md:ml-0">{planData.teacherName || meta.teacherName}</span></p>
            <p className="md:text-right flex md:block flex-wrap items-center"><strong>Date:</strong> <span className="ml-1 md:ml-0">{planData.date || meta.startDate || "......................"}</span></p>

            <p className="flex md:block flex-wrap items-center"><strong>School:</strong> <span className="ml-1 md:ml-0">{schoolName}</span></p>
            <p className="md:text-right flex md:block flex-wrap items-center"><strong>Time:</strong> <span className="ml-1 md:ml-0">{planData.time}</span></p>
            
            <p className="flex md:block flex-wrap items-center"><strong>Grade:</strong> <span className="ml-1 md:ml-0">{meta.grade}</span></p>
            <p className="md:text-right flex md:block flex-wrap items-center"><strong>Duration:</strong> <span className="ml-1 md:ml-0">{planData.duration || "40 min"}</span></p>
            
            <p className="flex md:block flex-wrap items-center"><strong>Subject:</strong> <span className="ml-1 md:ml-0">{meta.subject}</span></p>
            <p className="md:text-right flex md:block flex-wrap items-center"><strong>Enrolment:</strong> <span className="ml-1 md:ml-0">B: {meta.boys || planData.enrolment?.boys || 0} G: {meta.girls || planData.enrolment?.girls || 0}</span></p>
        </div>
        
        <hr className="mb-4 border-black" />

        {/* Topic Section */}
        <div className="mb-6 text-sm pb-4">
            <div className="mb-2">
                <strong className="block mb-1">Topic:</strong> 
                <div className="bg-slate-50 md:bg-transparent rounded md:rounded-none overflow-hidden flex items-stretch">
                    <EditableArrayCell value={planData.topic} onChange={(val: any) => handleFieldChange('topic', val)} className="h-auto min-h-0 py-1 md:py-0" />
                </div>
            </div>
            <div>
                <strong className="block mb-1">Sub-topic:</strong> 
                <div className="bg-slate-50 md:bg-transparent rounded md:rounded-none overflow-hidden flex items-stretch">
                    <EditableArrayCell value={displaySubtopic} onChange={(val: any) => handleFieldChange('subtopic', val)} className="h-auto min-h-0 py-1 md:py-0" />
                </div>
            </div>
        </div>

        {/* Text Blocks */}
        <div className="space-y-4 mb-8 text-justify">
            {renderEditableBlock("Expected Standard", "expected_standard", planData.expected_standard, true)}
            
            {/* 🆕 RATIONALE BLOCK ADDED HERE */}
            {planData.rationale && renderEditableBlock("Rationale", "rationale", planData.rationale, true)}
            
            {planData.learning_environment && (
                <div className="mb-3">
                    <strong className="block text-slate-800 mb-2">Learning Environment:</strong>
                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:pl-4 md:border-l-2 md:border-slate-300">
                        <div><span className="font-bold block md:inline md:mr-2">Natural:</span> <div className="bg-slate-50 md:bg-transparent rounded overflow-hidden mt-1 md:mt-0 flex"><EditableArrayCell value={planData.learning_environment.natural} onChange={(val: any) => handleFieldChange('learning_environment', {...planData.learning_environment, natural: val})} className="h-auto min-h-0 py-1" /></div></div>
                        <div><span className="font-bold block md:inline md:mr-2">Technological:</span> <div className="bg-slate-50 md:bg-transparent rounded overflow-hidden mt-1 md:mt-0 flex"><EditableArrayCell value={planData.learning_environment.technological} onChange={(val: any) => handleFieldChange('learning_environment', {...planData.learning_environment, technological: val})} className="h-auto min-h-0 py-1" /></div></div>
                        <div><span className="font-bold block md:inline md:mr-2">Artificial:</span> <div className="bg-slate-50 md:bg-transparent rounded overflow-hidden mt-1 md:mt-0 flex"><EditableArrayCell value={planData.learning_environment.artificial} onChange={(val: any) => handleFieldChange('learning_environment', {...planData.learning_environment, artificial: val})} className="h-auto min-h-0 py-1" /></div></div>
                    </div>
                </div>
            )}

            {renderEditableBlock("Teaching/Learning Aids", "materials", planData.materials, true)}
            {renderEditableBlock("References", "references", planData.references, true)}
        </div>

        {/* ⚡️ THE DYNAMIC EDITABLE TABLE */}
        <div className="w-full max-w-full">
            <table className="w-full text-left md:border-collapse block md:table border-none md:border border-black mb-8 text-[10pt] print:table print:border-collapse print:border">
                <thead className="hidden md:table-header-group print:table-header-group">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className={`border border-black p-2 text-left bg-gray-100 font-bold uppercase text-xs ${col.key === 'stage_time' ? 'w-[15%]' : ''}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="block md:table-row-group print:table-row-group">
                    {(planData.steps || []).map((step: any, idx: number) => (
                        <tr key={idx} className="block md:table-row bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none mb-6 md:mb-0 relative group print:table-row print:border-none print:shadow-none print:rounded-none print:mb-0">
                            
                            {/* 📱 MOBILE-ONLY CARD HEADER */}
                            <div className="md:hidden flex justify-between items-center p-3 bg-slate-50 border-b border-slate-100 rounded-t-xl print:hidden">
                                <span className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Row {idx + 1}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleInsertRow(idx)} className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md shadow-sm hover:bg-slate-100" title="Insert Below"><Plus size={14}/></button>
                                    <button onClick={() => handleDeleteRow(idx)} className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-md shadow-sm hover:bg-rose-100" title="Delete Row"><Trash2 size={14}/></button>
                                </div>
                            </div>

                            {columns.map((col) => {
                                if (col.key === 'stage_time') {
                                    return (
                                        <td key={col.key} className="block md:table-cell p-4 md:p-1 border-b border-slate-100 md:border-b-0 md:border border-black align-top bg-transparent md:bg-gray-50 relative md:w-[15%] print:table-cell print:border print:bg-gray-50 print:p-1">
                                            <div className="md:hidden text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider print:hidden">
                                                {col.label}
                                            </div>
                                            
                                            <div className="flex flex-col h-full gap-2 p-1 bg-slate-50 md:bg-transparent rounded-lg md:rounded-none overflow-hidden print:border-none print:bg-transparent print:rounded-none">
                                                <EditableArrayCell value={step.stage} onChange={(val: any) => handleStepChange(idx, 'stage', val)} className="font-bold md:text-center h-auto min-h-0 py-1" />
                                                <EditableArrayCell value={step.time} onChange={(val: any) => handleStepChange(idx, 'time', val)} className="text-xs md:text-center h-auto min-h-0 py-1" />
                                            </div>

                                            <div className="hidden md:flex absolute -left-10 top-2 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                                <button onClick={() => handleInsertRow(idx)} className="p-1 text-slate-500 hover:bg-slate-200 rounded" title="Insert Row Below"><Plus size={14} /></button>
                                                <button onClick={() => handleDeleteRow(idx)} className="p-1 text-rose-500 hover:bg-rose-100 rounded" title="Delete Row"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    )
                                }
                                return (
                                    <td key={col.key} className={`block md:table-cell p-4 md:p-0 border-b border-slate-100 md:border-b-0 md:border border-black align-top last:border-b-0 print:table-cell print:border print:p-0 ${col.key === 'assessment_criteria' ? 'italic' : ''}`}>
                                        <div className="md:hidden text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider print:hidden">
                                            {col.label}
                                        </div>
                                        <div className="min-h-[60px] md:min-h-full h-full flex items-stretch bg-slate-50 border border-slate-100 md:border-none md:bg-transparent rounded-lg md:rounded-none overflow-hidden print:border-none print:bg-transparent print:rounded-none">
                                           <EditableArrayCell value={step[col.key]} onChange={(val: any) => handleStepChange(idx, col.key, val)} />
                                        </div>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                    {/* BOTTOM ROW ADD BUTTON */}
                    <tr className="block md:table-row print:hidden">
                        <td colSpan={columns.length} className="block md:table-cell p-0 md:p-2 bg-transparent md:bg-gray-50 border-none md:border border-black text-center print:hidden">
                            <button onClick={handleAddRowToBottom} className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-6 py-4 md:py-1.5 bg-indigo-50 md:bg-slate-200 text-indigo-700 md:text-slate-700 font-bold rounded-xl md:rounded-lg border-2 border-dashed border-indigo-200 md:border-none hover:bg-indigo-100 md:hover:bg-slate-300 transition-colors text-sm md:text-xs">
                                <PlusCircle size={14} className="md:w-[14px] md:h-[14px]" /> Add New Row
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Homework Section */}
        <div className="mt-4 p-4 border border-slate-300 rounded bg-slate-50 mb-4">
            <strong className="uppercase block mb-2 text-sm text-slate-700">Homework:</strong>
            <div className="bg-white md:bg-transparent rounded md:rounded-none overflow-hidden flex items-stretch">
                <EditableArrayCell 
                    value={planData.homework || planData.homework_content} 
                    onChange={(val: any) => handleFieldChange('homework', val)} 
                    className="font-handwriting text-slate-600 leading-relaxed min-h-[60px]"
                />
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 🎨 NEW: CHALKBOARD DIAGRAM GENERATOR UI */}
        {/* ========================================================================= */}
        <div className="mt-6 mb-8 p-5 border-2 border-dashed border-slate-200 rounded-xl bg-white print:hidden">
            <strong className="uppercase block mb-3 text-sm text-slate-800 flex items-center gap-2">
                <ImageIcon size={18} className="text-emerald-600" /> Chalkboard Diagram Generator
            </strong>
            <p className="text-xs text-slate-500 mb-3">
              Need to draw something complex on the board? Tell the AI what to draw, and it will generate a simple, high-contrast outline diagram.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="e.g., The Human Digestive System, Water Cycle"
                    value={diagramPrompt}
                    onChange={(e) => setDiagramPrompt(e.target.value)}
                    className="flex-1 p-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <button
                    onClick={onGenerateDiagram}
                    disabled={generatingDiagram || !diagramPrompt.trim()}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                    {generatingDiagram ? <Loader2 size={16} className="animate-spin"/> : <PenTool size={16}/>}
                    {generatingDiagram ? "Drawing..." : "Generate Diagram"}
                </button>
            </div>

            {planData.diagrams && planData.diagrams.length > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {planData.diagrams.map((diag: any, i: number) => (
                        <div key={i} className="border-2 border-slate-100 p-4 bg-white rounded-xl shadow-sm flex flex-col items-center group relative">
                            <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{diag.prompt}</p>
                            
                            <div 
                              dangerouslySetInnerHTML={{ __html: diag.svg }} 
                              className="w-full max-w-sm flex items-center justify-center p-4 bg-slate-50 rounded-lg"
                            />

                            <button 
                                onClick={() => {
                                  const updated = planData.diagrams.filter((_: any, idx: number) => idx !== i);
                                  handleFieldChange('diagrams', updated);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-500 rounded hover:bg-rose-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* ========================================================================= */}
        {/* 🧠 NEW: LESSON EVALUATION & REMEDIAL LOOP UI (PDF UPDATED) */}
        {/* ========================================================================= */}
        <div className="mt-8 p-5 border-2 border-slate-200 print:border-none print:p-0 rounded-xl bg-slate-50 print:bg-transparent break-inside-avoid">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4 print:mb-2">
                <strong className="uppercase text-sm font-black text-slate-800">Post-Lesson Evaluation:</strong>
                <span className="text-xs text-slate-500 print:hidden">What did students struggle to understand?</span>
            </div>

            {/* 💻 WEB VIEW: Interactive Textarea (Hidden on PDF) */}
            <textarea
                value={evaluationFeedback}
                onChange={(e) => setEvaluationFeedback(e.target.value)}
                placeholder="e.g., Most of the class didn't understand how to find the common denominator..."
                className="w-full p-4 border border-slate-300 rounded-xl min-h-[100px] mb-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-inner transition-all print:hidden"
            />

            {/* 🖨️ PRINT VIEW: Clean Text Block (Visible only on PDF) */}
            <div className="hidden print:block w-full text-black font-serif text-[10pt] sm:text-[11pt] whitespace-pre-wrap min-h-[40px]">
                {evaluationFeedback || "........................................................................................................................................................"}
            </div>

            {/* AI Action Buttons wrapped in print:hidden so they never show on paper */}
            <div className="print:hidden">
                {!evaluationData ? (
                    <button
                        onClick={onEvaluateLesson}
                        disabled={evaluating || !evaluationFeedback.trim()}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        {evaluating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {evaluating ? "Analyzing Feedback..." : "Analyze & Troubleshoot"}
                    </button>
                ) : (
                    <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm mt-4 animate-in fade-in zoom-in-95">
                        <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2 border-b border-indigo-50 pb-3">
                            <Sparkles size={18} className="text-indigo-500"/> Pedagogical Advice
                        </h4>
                        <p className="text-slate-700 text-sm mb-5 italic border-l-4 border-indigo-200 pl-3">
                            "{evaluationData.empathy_statement}"
                        </p>
                        
                        <strong className="text-xs text-slate-500 uppercase tracking-wider block mb-3">Suggested Quick Fixes for Tomorrow:</strong>
                        <ul className="space-y-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            {evaluationData.quick_fixes?.map((fix: string, idx: number) => (
                                <li key={idx} className="text-sm text-slate-800 flex items-start gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                                    <span>{fix}</span>
                                </li>
                            ))}
                        </ul>

                        {evaluationData.suggest_remedial && (
                            <div className="pt-5 border-t border-slate-200">
                                <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <span className="text-2xl">💡</span>
                                    <p className="text-sm text-amber-800 font-medium">This learning gap is significant. Would you like me to generate a highly-targeted Remedial Lesson Plan for tomorrow using alternative teaching methods?</p>
                                </div>
                                
                                <button
                                    onClick={onGenerateRemedial}
                                    disabled={generatingRemedial}
                                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    {generatingRemedial ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                                    {generatingRemedial ? "Drafting Remedial Plan..." : "Generate Remedial Lesson Now"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 📚 LESSON NOTES (BLACKBOARD PREVIEW) */}
        {/* ========================================================================= */}
        {notesData && (
             <div className="mt-12 pt-8 border-t-4 border-double border-slate-300 break-before-page">
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-t-lg flex items-center gap-2 sm:gap-3">
                    <BookOpen className="text-yellow-400 shrink-0" size={20} />
                    <h2 className="text-base sm:text-xl font-bold tracking-wide truncate">LESSON NOTES (Blackboard)</h2>
                </div>
                <div className="bg-white border-x border-b border-slate-300 p-4 sm:p-6 rounded-b-lg shadow-sm font-sans text-slate-800">
                    
                    <h3 className="text-base sm:text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-center uppercase text-slate-900 break-words">
                        {notesData.topic_heading}
                    </h3>
                    
                    {notesData.key_definitions && notesData.key_definitions.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Key Definitions</h4>
                            <ul className="space-y-3 text-sm">
                                {notesData.key_definitions.map((def: any, i: number) => (
                                    <li key={i} className="pl-3 sm:pl-4 border-l-4 border-yellow-400 break-words">
                                        <span className="font-bold text-slate-900">{def.term}:</span> {def.definition}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {notesData.explanation_points && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Explanation</h4>
                            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm break-words">
                                {notesData.explanation_points.map((pt: string, i: number) => (
                                    <li key={i}>{pt}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {notesData.worked_examples && notesData.worked_examples.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Worked Examples</h4>
                            <div className="space-y-3">
                                {notesData.worked_examples.map((ex: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200 text-sm break-words">
                                        <p className="font-bold text-slate-800 mb-1">Example {i+1}:</p>
                                        <p className="mb-2">{ex.question}</p>
                                        <p className="text-slate-600 italic border-t pt-2 mt-2 border-slate-200">Solution: {ex.solution}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {notesData.class_exercise && (
                        <div className="mb-6">
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Class Exercise</h4>
                            <ol className="list-decimal pl-4 sm:pl-5 space-y-1 text-sm break-words">
                                {notesData.class_exercise.map((q: string, i: number) => (
                                    <li key={i}>{q}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {notesData.homework_question && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Homework</h4>
                            <div className="p-3 border border-slate-200 rounded bg-slate-50 text-sm break-words">
                                {Array.isArray(notesData.homework_question) ? (
                                    <ul className="list-disc pl-4 sm:pl-5">
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
    </>
  );
}