import React, { useState, useEffect } from 'react';
import { Trash2, Plus, PlusCircle } from 'lucide-react';

// ✅ DEFAULT ASSET CONSTANT
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg";

// --- Types ---
export interface SchemeRow {
  month?: string;
  week?: string;
  unit?: string; 
  topic?: string;
  prescribed_competences?: string[];
  specific_competences?: string[];
  content?: string[];
  learning_activities?: string[];
  methods?: string[];
  assessment?: string[];
  resources?: string[];
  references?: string[];
  outcomes?: string[]; 
  isSpecialRow?: boolean; 
  [key: string]: any; 
}

export interface TableColumn {
  key: string;
  label: string;
}

interface SchemesOfWorkProps {
  schoolName?: string;
  schoolLogo?: string; 
  termInfo?: string;
  subject?: string;
  grade?: string;
  startDate?: string;
  data: SchemeRow[];
  introInfo?: {
    philosophy?: string;
    competence_learning?: string;
    goals?: string[];
  };
  onDataChange?: (newData: SchemeRow[]) => void; 
  columns?: TableColumn[];
  onColumnsChange?: (newColumns: TableColumn[]) => void;
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

const SchemesOfWork: React.FC<SchemesOfWorkProps> = ({
  schoolName = "Global Academy",
  schoolLogo,
  termInfo = "First Term",
  subject = "Subject",
  grade = "Grade",
  data = [],
  introInfo,
  onDataChange,
  columns = DEFAULT_COLUMNS,
  onColumnsChange
}) => {

  const [localData, setLocalData] = useState<SchemeRow[]>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // --- 🆕 ROW & COLUMN MANAGEMENT HANDLERS ---
  const handleDeleteRow = (index: number) => {
    const newData = localData.filter((_, i) => i !== index);
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const handleInsertRow = (index: number) => {
    const newData = [...localData];
    newData.splice(index + 1, 0, { week: "", topic: "" });
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const handleAddRowToBottom = () => {
    const newData = [...localData, { week: "", topic: "" }];
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const handleAddColumn = () => {
    if (onColumnsChange) {
      const newKey = `custom_${Date.now()}`;
      onColumnsChange([...columns, { key: newKey, label: "NEW COLUMN" }]);
    }
  };

  // --- TEXT/ARRAY HANDLERS ---
  const handleTextUpdate = (index: number, field: string, value: string) => {
    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: value };
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const handleArrayUpdate = (index: number, field: string, value: string) => {
    const newArray = value.split('\n').filter(s => s.trim() !== '');
    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: newArray };
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const EditableArrayCell = ({ value, onChange }: { value?: string[], onChange: (val: string) => void }) => {
    const displayValue = (value || []).join('\n');
    return (
      <textarea
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="- Type here&#10;- New line for bullet"
        className="w-full h-full min-h-[80px] p-2 text-[11px] leading-snug text-slate-700 bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded outline-none resize-none focus:resize-y transition-colors break-words print:resize-none print:border-none print:overflow-hidden"
      />
    );
  };

  const renderHeader = () => (
    <div className="flex flex-col items-center justify-center text-center gap-4 mb-6 border-b border-slate-200 pb-6 w-full">
        <div className="relative h-20 w-20 md:h-28 md:w-28 shrink-0">
            <img 
                src={schoolLogo || COAT_OF_ARMS_URL} 
                alt="School Logo" 
                crossOrigin="anonymous" 
                className="h-full w-full object-contain"
            />
        </div>
        <div className="flex flex-col items-center justify-center w-full break-words">
            {!schoolLogo && (
                <div className="text-slate-500 font-bold text-[10px] md:text-xs tracking-[0.2em] mb-1 uppercase text-center">
                    Republic of Zambia <br/> Ministry of Education
                </div>
            )}
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-2 text-center break-words px-2 w-full">
                {schoolName}
            </h1>
            <div className="h-1 w-16 md:w-24 bg-indigo-600 mb-3 rounded-full"></div>
            <p className="text-indigo-600 font-bold text-xs md:text-base tracking-widest uppercase text-center break-words px-2">
               {subject} • Grade {grade} • Scheme of Work
            </p>
            <div className="mt-3 inline-block bg-slate-100 px-3 md:px-4 py-1 rounded-full text-slate-600 text-[10px] md:text-xs font-bold uppercase tracking-wider border border-slate-200 text-center">
                {termInfo} • {new Date().getFullYear()}
            </div>
        </div>
    </div>
  );

  return (
    <div className="w-full bg-white text-slate-800 font-sans shadow-inner print:shadow-none p-4 md:p-8 relative min-w-0">
      
      {renderHeader()}

      {introInfo && (
        <div className="bg-slate-50 p-4 md:p-6 rounded-lg border border-slate-200 mb-8 print:p-4 break-after-page w-full min-w-0">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-sm text-slate-700">
              <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider border-b border-slate-200 pb-1 break-words">Curriculum Philosophy</h3>
                  <p className="mb-6 leading-relaxed text-justify break-words">{introInfo.philosophy || "N/A"}</p>
                  <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider border-b border-slate-200 pb-1 break-words">Competence-Based Learning</h3>
                  <p className="leading-relaxed text-justify break-words">{introInfo.competence_learning || "N/A"}</p>
              </div>
              <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider border-b border-slate-200 pb-1 break-words">Curriculum Goals</h3>
                  <ul className="space-y-2">
                      {(introInfo.goals || []).map((g: string, i: number) => (
                          <li key={i} className="flex gap-2 items-start break-words">
                              <span className="text-indigo-500 font-bold mt-[2px] shrink-0">✓</span>
                              <span className="leading-snug min-w-0">{g}</span>
                          </li>
                      ))}
                  </ul>
              </div>
           </div>
        </div>
      )}

      {/* 3A. MOBILE VIEW (Cards instead of Table) */}
      <div className="block xl:hidden space-y-4 md:space-y-6 print:hidden w-full min-w-0">
         <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 bg-slate-100 p-2 rounded text-center">
            Tap any field to edit directly
         </div>
         {localData.map((row, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative w-full min-w-0">
               
               {/* MOBILE DELETE ROW BUTTON */}
               <button 
                 onClick={() => handleDeleteRow(index)}
                 className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all z-10 shrink-0"
               >
                 <Trash2 size={16} />
               </button>

               {row.isSpecialRow ? (
                  <div className="p-3 md:p-4 bg-indigo-50 border-b border-indigo-100 text-center pr-12 md:pr-14 min-w-0">
                     <span className="text-xs font-bold text-indigo-400 uppercase">Week {row.week}</span>
                     {/* 🛠 FIXED: Added min-w-0 to prevent flex blowout */}
                     <input
                        value={row.topic || ""}
                        onChange={(e) => handleTextUpdate(index, 'topic', e.target.value)}
                        className="w-full min-w-0 text-center font-black text-indigo-700 uppercase tracking-widest bg-transparent outline-none mt-2 text-sm md:text-base"
                        placeholder="REVISION & ASSESSMENT"
                     />
                  </div>
               ) : (
                  <>
                     <div className="bg-indigo-600 p-3 text-white flex items-center gap-2 md:gap-3 pr-12 md:pr-14 min-w-0 w-full">
                        <div className="bg-indigo-800 px-2 py-1 rounded text-[10px] md:text-xs font-bold shrink-0">WK {row.week}</div>
                        {/* 🛠 FIXED: Added min-w-0 to flex child input */}
                        <input
                           value={row.topic || ""}
                           onChange={(e) => handleTextUpdate(index, 'topic', e.target.value)}
                           className="flex-1 min-w-0 font-bold bg-transparent border-b border-indigo-400 focus:border-white outline-none placeholder-indigo-300 text-sm"
                           placeholder="Enter Topic..."
                        />
                     </div>
                     <div className="p-3 md:p-4 space-y-4 text-xs w-full min-w-0">
                        {columns.filter(col => col.key !== 'week' && col.key !== 'topic').map(col => (
                           <div key={col.key} className="w-full min-w-0">
                               <label className="font-bold text-slate-500 mb-1 block uppercase text-[10px] break-words">{col.label}</label>
                               <EditableArrayCell 
                                   value={row[col.key]} 
                                   onChange={(val) => handleArrayUpdate(index, col.key, val)} 
                               />
                           </div>
                        ))}
                     </div>
                  </>
               )}
            </div>
         ))}
         
         <div className="flex flex-col gap-3">
             <button 
               onClick={handleAddRowToBottom}
               className="w-full py-3 md:py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-indigo-100 transition-all text-sm"
             >
               <PlusCircle size={18} /> Add New Week
             </button>
             <button 
               onClick={handleAddColumn}
               className="w-full py-3 md:py-4 bg-emerald-50 border-2 border-dashed border-emerald-200 text-emerald-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-emerald-100 transition-all text-sm"
             >
               <PlusCircle size={18} /> Add New Column
             </button>
         </div>
      </div>

      {/* 3B. DESKTOP & PRINT VIEW (Giant Dynamic Table) */}
      <div className="hidden xl:block overflow-x-auto print:block pb-10 w-full min-w-0">
        {/* ... The entire Desktop Table Code remains identical ... */}
        <table className="w-full min-w-[2200px] border-collapse table-fixed text-[11px] leading-normal">
          <thead>
            <tr className="bg-indigo-600 text-white uppercase tracking-wider font-bold">
              {columns.map(col => (
                <th key={col.key} className={`border border-indigo-700 p-2 text-left ${col.key === 'week' ? 'w-20 text-center' : col.key === 'topic' ? 'w-40' : 'w-48'}`}>
                  {col.label}
                </th>
              ))}
              <th className="w-20 border border-indigo-700 p-2 text-center print:hidden bg-slate-800 text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {localData.length === 0 ? (
               <tr>
                 <td colSpan={columns.length + 1} className="p-12 text-center text-slate-400 italic bg-slate-50">
                   Waiting for syllabus data...
                 </td>
               </tr>
            ) : (
              localData.map((row, index) => (
                <tr key={index} className={`group ${row.isSpecialRow ? "bg-slate-50" : "hover:bg-indigo-50/10 transition-colors"}`}>
                  
                  {row.isSpecialRow ? (
                    <>
                        <td className="border border-slate-200 p-2 text-center font-bold text-slate-900 align-top">
                          <input 
                             value={row.week || ""} 
                             onChange={(e) => handleTextUpdate(index, 'week', e.target.value)}
                             className="w-full text-center bg-transparent border-none outline-none font-bold" 
                          />
                        </td>
                        <td colSpan={columns.length - 1} className="border border-slate-200 p-4 text-center font-black text-indigo-600 uppercase tracking-[0.2em] italic align-middle">
                           --- <input 
                                  value={row.topic || ""} 
                                  onChange={(e) => handleTextUpdate(index, 'topic', e.target.value)}
                                  className="bg-transparent text-center border-b border-indigo-200 focus:border-indigo-500 outline-none placeholder-indigo-300 w-1/2"
                                  placeholder="REVISION & ASSESSMENT"
                               /> ---
                        </td>
                    </>
                  ) : (
                    columns.map(col => {
                        if (col.key === 'week') {
                            return (
                                <td key={col.key} className="border border-slate-200 p-2 text-center font-bold text-slate-900 align-top">
                                  <input 
                                     value={row.week || ""} 
                                     onChange={(e) => handleTextUpdate(index, 'week', e.target.value)}
                                     className="w-full text-center bg-transparent border-none outline-none font-bold" 
                                  />
                                </td>
                            )
                        }
                        if (col.key === 'topic') {
                            return (
                                <td key={col.key} className="border border-slate-200 p-0 align-top">
                                  <textarea 
                                    value={row.topic || ""} 
                                    onChange={(e) => handleTextUpdate(index, 'topic', e.target.value)}
                                    className="w-full h-full min-h-[80px] p-2 font-bold text-slate-800 bg-transparent border-none outline-none resize-none focus:bg-slate-50"
                                  />
                               </td>
                            )
                        }
                        return (
                            <td key={col.key} className={`border border-slate-200 p-0 align-top ${col.key === 'references' ? 'text-[10px] italic text-slate-500' : ''}`}>
                                <EditableArrayCell 
                                    value={row[col.key] || (col.key === 'specific_competences' ? row.outcomes : undefined)} 
                                    onChange={(val) => handleArrayUpdate(index, col.key, val)} 
                                />
                            </td>
                        )
                    })
                  )}

                  <td className="border border-slate-200 p-2 text-center align-middle print:hidden bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <button onClick={() => handleInsertRow(index)} className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded transition-colors" title="Insert Row Below">
                         <Plus size={14} />
                       </button>
                       <button onClick={() => handleDeleteRow(index)} className="p-1.5 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded transition-colors" title="Delete Row">
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
            
            <tr className="print:hidden">
              <td colSpan={columns.length + 1} className="p-4 bg-white border border-slate-200 text-center">
                 <div className="flex items-center justify-center gap-4">
                     <button 
                       onClick={handleAddRowToBottom}
                       className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                     >
                       <PlusCircle size={18} /> Add New Row
                     </button>
                     <button 
                       onClick={handleAddColumn}
                       className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                     >
                       <PlusCircle size={18} /> Add New Column
                     </button>
                 </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* 🛠 FIXED: Replaced grid with flex-col on small screens to prevent overflow */}
      <div className="p-4 md:p-12 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-4 page-break-inside-avoid mt-8 w-full min-w-0">
        <div className="border-t-2 border-slate-900 pt-3 text-center sm:text-left w-full sm:w-auto">
          <p className="font-black text-[10px] uppercase tracking-tighter text-slate-900">Teacher's Signature</p>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">DATE: ____/____/202__</p>
        </div>
        <div className="border-t-2 border-slate-900 pt-3 text-center sm:text-right w-full sm:w-auto">
          <p className="font-black text-[10px] uppercase tracking-tighter text-slate-900">Head Teacher / Supervisor</p>
          <p className="text-[10px] text-slate-400 mt-2 font-mono">STAMP/DATE: ____/____/202__</p>
        </div>
      </div>
    </div>
  );
};

export default SchemesOfWork;