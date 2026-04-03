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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
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
      rows={1}
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
  
  handleFieldChange: (field: string, val: any) => void;
  handleStepChange: (index: number, field: string, val: any) => void;
  handleInsertRow: (index: number) => void;
  handleDeleteRow: (index: number) => void;
  handleAddRowToBottom: () => void;

  diagramPrompt: string;
  setDiagramPrompt: (val: string) => void;
  generatingDiagram: boolean;
  onGenerateDiagram: () => void;
}

export default function LessonPlanDocument({
  planData, meta, schoolName, columns, displaySubtopic, notesData, coatOfArmsUrl,
  handleFieldChange, handleStepChange, handleInsertRow, handleDeleteRow, handleAddRowToBottom,
  diagramPrompt, setDiagramPrompt, generatingDiagram, onGenerateDiagram
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
        <div className="w-full max-w-full mb-8">
            <table className="w-full text-left md:border-collapse block md:table border-none md:border border-black text-[10pt] print:table print:border-collapse print:border">
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
                            
                            <div className="md:hidden flex justify-between items-center p-3 bg-slate-50 border-b border-slate-100 rounded-t-xl print:hidden">
                                <span className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Row {idx + 1}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleInsertRow(idx)} className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md shadow-sm hover:bg-slate-100" title="Insert Below"><Plus size={14}/></button>
                                    <button onClick={() => handleDeleteRow(idx)} className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-md shadow-sm hover:bg-rose-100" title="Delete Row"><Trash2 size={14}/></button>
                                </div>
                            </div>

                            {columns.map((col, cIdx) => (
                                <td key={cIdx} className="block md:table-cell p-3 md:p-2 border-b md:border border-slate-100 md:border-black align-top last:border-b-0 print:table-cell print:border print:border-black">
                                    <div className="md:hidden text-xs font-bold text-slate-400 mb-1 uppercase print:hidden">{col.label}</div>
                                    <div className="bg-slate-50 md:bg-transparent rounded md:rounded-none overflow-hidden">
                                        {col.key === 'stage_time' ? (
                                            <div className="flex flex-col gap-2">
                                                <EditableArrayCell value={step.stage} onChange={(val: any) => handleStepChange(idx, 'stage', val)} placeholder="Stage" className="font-bold uppercase text-xs" />
                                                <EditableArrayCell value={step.time} onChange={(val: any) => handleStepChange(idx, 'time', val)} placeholder="Time" className="text-xs italic text-slate-600" />
                                            </div>
                                        ) : (
                                            <EditableArrayCell value={step[col.key]} onChange={(val: any) => handleStepChange(idx, col.key, val)} isArray={true} />
                                        )}
                                    </div>
                                </td>
                            ))}

                            <div className="hidden md:flex absolute top-1/2 -right-10 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex-col gap-1 print:hidden">
                                <button onClick={() => handleInsertRow(idx)} className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-full shadow-sm hover:bg-slate-100" title="Insert Below"><Plus size={14}/></button>
                                <button onClick={() => handleDeleteRow(idx)} className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-full shadow-sm hover:bg-rose-100" title="Delete Row"><Trash2 size={14}/></button>
                            </div>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex justify-center print:hidden">
                <button onClick={handleAddRowToBottom} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#6c2dc7] bg-[#6c2dc7]/10 hover:bg-[#6c2dc7]/20 rounded-full transition-colors">
                    <PlusCircle size={16} /> Add Next Step
                </button>
            </div>
        </div>

        {/* Homework & Evaluation Blocks */}
        <div className="space-y-4 mb-8 text-justify">
            {renderEditableBlock("Homework", "homework_content", planData.homework || planData.homework_content, true)}
            
            {/* 🚀 THE EVALUATION BLOCK (Updates instantly when cards are clicked) */}
            {renderEditableBlock("Evaluation", "evaluation", planData.evaluation || planData.evaluation_footer || "..................................................................................", true)}
        </div>

        {/* Chalkboard Diagrams */}
        {planData.diagrams && planData.diagrams.map((diag: any, idx: number) => (
            <div key={idx} className="mt-8 border-t-2 border-dashed border-slate-200 pt-6">
                <h4 className="font-bold text-slate-800 uppercase tracking-widest mb-4">Chalkboard Diagram: {diag.prompt}</h4>
                <div className="w-full bg-[#1e293b] rounded-xl p-4 flex justify-center shadow-inner">
                    <img src={diag.base64 || diag.content} alt={diag.prompt} className="max-w-full h-auto rounded filter contrast-125 brightness-110" />
                </div>
            </div>
        ))}

        {/* Generate Diagram Form */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl print:hidden text-center">
            <h4 className="font-bold text-slate-700 flex items-center justify-center gap-2 mb-2"><ImageIcon size={18}/> Need a Chalkboard Diagram?</h4>
            <div className="flex gap-2 max-w-md mx-auto">
                <input type="text" placeholder="e.g. A plant cell with labels..." className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-[#ffa500]" value={diagramPrompt} onChange={(e) => setDiagramPrompt(e.target.value)} />
                <button onClick={onGenerateDiagram} disabled={generatingDiagram} className="px-4 py-2 bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold text-sm rounded transition-colors flex items-center gap-2 disabled:opacity-50">
                    {generatingDiagram ? <Loader2 size={16} className="animate-spin" /> : <PenTool size={16} />} Draw
                </button>
            </div>
        </div>

        {/* Black Board Notes */}
        {notesData && (
            <div className="mt-12 pt-8 border-t-4 border-double border-slate-300 text-left">
                <div className="flex items-center gap-3 mb-6">
                    <BookOpen size={24} className="text-[#6c2dc7]" />
                    <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Lesson Notes (Blackboard)</h3>
                </div>
                
                <div className="space-y-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 shadow-sm">
                    {notesData.topic_heading && (
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h4 className="font-black text-lg uppercase tracking-wider">{notesData.topic_heading}</h4>
                        </div>
                    )}

                    {notesData.key_definitions && notesData.key_definitions.length > 0 && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Key Definitions</h4>
                            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm break-words">
                                {notesData.key_definitions.map((def: any, i: number) => (
                                    <li key={i}><strong>{def.term}:</strong> {def.definition}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {notesData.explanation_points && notesData.explanation_points.length > 0 && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Explanation</h4>
                            <ul className="list-disc pl-4 sm:pl-5 space-y-1 text-sm break-words">
                                {notesData.explanation_points.map((point: string, i: number) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {notesData.worked_examples && notesData.worked_examples.length > 0 && (
                        <div>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs sm:text-sm bg-slate-100 p-1 pl-2">Worked Examples</h4>
                            <div className="space-y-3">
                                {notesData.worked_examples.map((ex: any, i: number) => (
                                    <div key={i} className="text-sm bg-slate-50 p-3 rounded border border-slate-200 break-words">
                                        <p className="font-bold mb-1 text-slate-800">Q: {ex.question}</p>
                                        <p className="pl-4 border-l-2 border-[#ffa500] text-slate-700 whitespace-pre-wrap">{ex.solution}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {notesData.class_exercise && notesData.class_exercise.length > 0 && (
                        <div>
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