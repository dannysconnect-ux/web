import React, { useState, useEffect } from 'react';
import { Trash2, Plus, PlusCircle } from 'lucide-react';

// ✅ DEFAULT ASSET CONSTANT
const COAT_OF_ARMS_URL = "/Coat_of_arms_of_Zambia.svg";

// --- Types ---
export interface SchemeRow {
  week?: number | string;
  date_range?: string;
  topic_content?: string;         
  outcomes?: string[] | string;
  methods?: string[] | string;    
  resources?: string[] | string;
  references?: string[] | string; 
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
  onDataChange?: (newData: SchemeRow[]) => void; 
  columns?: TableColumn[]; 
  onColumnsChange?: (newColumns: TableColumn[]) => void; 
}

// 🆕 Default Columns for the Old Format
const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'week', label: 'Week' },
  { key: 'date_range', label: 'Date' },
  { key: 'topic_content', label: 'Topic / Content' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'methods', label: 'Methods' },
  { key: 'resources', label: 'Resources' },
  { key: 'references', label: 'References' }
];

// 🛠️ THE FIX: Moved helper outside so it isn't recreated on every keystroke
const toSafeArray = (item: string | string[] | undefined): string[] => {
  if (!item) return [];
  if (Array.isArray(item)) return item;
  if (item.includes('\n') && !item.includes('**')) { 
      return item.split('\n').filter(s => s.trim().length > 0);
  }
  return [item];
};

// 🛠️ THE FIX: Moved component outside and added local state for smooth typing
const EditableArrayCell = ({ value, onChange }: { value?: string[] | string, onChange: (val: string) => void }) => {
  const safeArray = toSafeArray(value);
  
  // Local state keeps typing fast and prevents cursor jumping
  const [localText, setLocalText] = useState(safeArray.join('\n'));

  // Keep it in sync if parent data loads from database
  useEffect(() => {
    setLocalText(safeArray.join('\n'));
  }, [value]);

  return (
    <textarea
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onBlur={(e) => {
         onChange(e.target.value); 
      }}
      placeholder="- Type here&#10;- New line for bullet"
      // 🛠 FIXED: Added break-words and ensured box-sizing behaves well
      className="w-full h-full min-h-[80px] p-2 text-[11px] leading-relaxed text-slate-700 bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded outline-none resize-none focus:resize-y transition-colors print:resize-none print:border-none print:overflow-hidden break-words"
    />
  );
};

const SchemesOfWork: React.FC<SchemesOfWorkProps> = ({
  schoolName = "Global Academy",
  schoolLogo, 
  termInfo = "First Term",
  subject = "Subject",
  grade = "Grade",
  startDate, 
  data = [],
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
    newData.splice(index + 1, 0, { week: "", topic_content: "" });
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const handleAddRowToBottom = () => {
    const newData = [...localData, { week: "", topic_content: "" }];
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
    const newArray = value.split('\n'); 
    const newData = [...localData];
    newData[index] = { ...newData[index], [field]: newArray };
    setLocalData(newData);
    if (onDataChange) onDataChange(newData);
  };

  const renderHeader = () => (
    // 🛠 FIXED: Adjusted spacing and flex layouts for mobile
    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-2 w-full min-w-0">
        <div className="relative h-16 w-16 sm:h-24 sm:w-24 shrink-0">
            <img 
                src={schoolLogo || COAT_OF_ARMS_URL} 
                alt="School Logo" 
                crossOrigin="anonymous"
                className="h-full w-full object-contain"
            />
        </div>
        <div className="text-center md:text-left flex-1 min-w-0 w-full">
            {!schoolLogo && (
                <div className="text-slate-500 font-bold text-[10px] sm:text-xs tracking-[0.2em] mb-1 uppercase">
                    Republic of Zambia <br className="hidden sm:block"/> Ministry of Education
                </div>
            )}
            
            {/* 🛠 FIXED: Scaled down text for mobile, added break-words */}
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight break-words">
                {schoolName}
            </h1>
            
            <div className="h-1 w-12 sm:w-20 bg-indigo-600 mt-2 mb-2 mx-auto md:mx-0"></div>

            <p className="text-indigo-600 font-bold text-xs sm:text-sm tracking-widest uppercase truncate">
               {subject} • Grade {grade} • Scheme of Work
            </p>
        </div>

        <div className="text-center md:text-right pt-2 md:pt-0 shrink-0">
            <div className="inline-block bg-slate-100 px-3 py-1 rounded text-slate-600 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 border border-slate-200">
                {termInfo}
            </div>
            {startDate && <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold">Starts: {startDate}</p>}
            <p className="text-slate-400 text-[9px] sm:text-[10px] mt-1 font-mono">
                Generated: {new Date().toLocaleDateString()}
            </p>
        </div>
    </div>
  );

  return (
    // 🛠 FIXED: Added min-w-0 to prevent body spill
    <div className="w-full min-w-0 bg-white text-slate-800 font-sans shadow-inner print:shadow-none p-2 sm:p-4 md:p-8">
      
      <div className="bg-slate-50 p-4 sm:p-6 md:p-8 border border-slate-200 rounded-xl mb-6 print:p-4 print:border-b print:rounded-none">
        {renderHeader()}
      </div>

      {/* MOBILE VIEW */}
      <div className="block xl:hidden space-y-4 sm:space-y-6 print:hidden w-full min-w-0">
         <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 bg-slate-100 p-2 rounded text-center">
            Tap any field to edit directly
         </div>
         {localData.map((row, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative w-full min-w-0">
               
               {/* 🆕 MOBILE DELETE ROW BUTTON */}
               <button 
                 onClick={() => handleDeleteRow(index)}
                 className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all z-10"
               >
                 <Trash2 size={14} className="sm:w-[16px] sm:h-[16px]" />
               </button>

               {row.isSpecialRow ? (
                  <div className="p-3 sm:p-4 bg-indigo-50 border-b border-indigo-100 text-center pr-12 sm:pr-14">
                     <span className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase">Week {row.week}</span>
                     <input
                        value={row.topic_content || ""}
                        onChange={(e) => handleTextUpdate(index, 'topic_content', e.target.value)}
                        className="w-full text-center font-black text-sm sm:text-base text-indigo-700 uppercase tracking-widest bg-transparent outline-none mt-2 min-w-0"
                        placeholder="REVISION & ASSESSMENT"
                     />
                  </div>
               ) : (
                  <>
                     <div className="bg-indigo-600 p-2 sm:p-3 text-white flex items-center gap-2 sm:gap-3 pr-12 sm:pr-14 min-w-0">
                        <div className="bg-indigo-800 px-2 py-1 rounded text-[10px] sm:text-xs font-bold shrink-0">WK</div>
                        <input
                           value={row.week || ""}
                           onChange={(e) => handleTextUpdate(index, 'week', e.target.value)}
                           className="w-10 sm:w-12 font-bold bg-transparent border-b border-indigo-400 focus:border-white outline-none text-center text-sm min-w-0"
                           placeholder="1"
                        />
                     </div>
                     <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs w-full min-w-0">
                        {/* 🆕 Dynamic Mobile Fields */}
                        {columns.filter(col => col.key !== 'week').map(col => (
                           <div key={col.key} className="w-full min-w-0">
                               <label className="font-bold text-slate-500 mb-1 block uppercase text-[9px] sm:text-[10px]">{col.label}</label>
                               {col.key === 'date_range' || col.key === 'topic_content' ? (
                                   <textarea
                                      value={row[col.key] || ""}
                                      onChange={(e) => handleTextUpdate(index, col.key, e.target.value)}
                                      className="w-full min-w-0 min-h-[60px] p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500 break-words"
                                   />
                               ) : (
                                   <EditableArrayCell 
                                       value={row[col.key]} 
                                       onChange={(val) => handleArrayUpdate(index, col.key, val)} 
                                   />
                               )}
                           </div>
                        ))}
                     </div>
                  </>
               )}
            </div>
         ))}
         
         {/* 🆕 MOBILE ADD BUTTONS */}
         <div className="flex flex-col gap-2 sm:gap-3">
             <button 
               onClick={handleAddRowToBottom}
               className="w-full py-3 sm:py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-indigo-100 transition-all text-xs sm:text-sm"
             >
               <PlusCircle size={18} className="sm:w-[20px] sm:h-[20px]" /> Add New Week
             </button>
             <button 
               onClick={handleAddColumn}
               className="w-full py-3 sm:py-4 bg-emerald-50 border-2 border-dashed border-emerald-200 text-emerald-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-emerald-100 transition-all text-xs sm:text-sm"
             >
               <PlusCircle size={18} className="sm:w-[20px] sm:h-[20px]" /> Add New Column
             </button>
         </div>
      </div>

      {/* DESKTOP VIEW */}
      {/* 🛠 FIXED: Kept exactly as is, it's designed to scroll horizontally on small screens if visible */}
      <div className="hidden xl:block overflow-x-auto print:block pb-10 w-full min-w-0">
        <table className="w-full min-w-[1200px] border-collapse table-fixed text-[11px] leading-relaxed">
          <thead>
            <tr className="bg-indigo-600 text-white uppercase tracking-wider">
              {/* 🆕 Dynamic Headers */}
              {columns.map(col => (
                <th key={col.key} className={`border border-indigo-700 p-3 font-bold ${col.key === 'week' ? 'w-[60px] text-center' : col.key === 'date_range' ? 'w-[100px] text-center' : col.key === 'topic_content' ? 'w-[25%] text-left' : 'w-[12%] text-left'}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {!localData || localData.length === 0 ? (
               <tr>
                 <td colSpan={columns.length} className="p-12 text-center text-slate-400 italic bg-slate-50">
                   Waiting for syllabus data generation...
                 </td>
               </tr>
            ) : (
              localData.map((row, index) => {
                return (
                <tr key={index} className={`group ${row.isSpecialRow ? "bg-slate-50" : "hover:bg-indigo-50/30 transition-colors"}`}>
                  
                  {row.isSpecialRow ? (
                    <>
                        <td className="border border-slate-200 p-2 text-center align-top font-bold text-slate-900 bg-slate-50/50 relative">
                          <input 
                             value={row.week || ""} 
                             onChange={(e) => handleTextUpdate(index, 'week', e.target.value)}
                             className="w-full text-center bg-transparent border-none outline-none font-bold" 
                          />
                          {/* 🆕 Row Actions nested inside Wk column */}
                          <div className="flex justify-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                             <button onClick={() => handleInsertRow(index)} title="Add Row Below" className="p-1 text-indigo-500 hover:bg-indigo-100 rounded"><Plus size={14} /></button>
                             <button onClick={() => handleDeleteRow(index)} title="Delete Row" className="p-1 text-rose-500 hover:bg-rose-100 rounded"><Trash2 size={14} /></button>
                          </div>
                        </td>
                        <td colSpan={columns.length - 1} className="border border-slate-200 p-4 text-center font-black text-indigo-600 uppercase tracking-[0.2em] italic">
                           --- <input 
                                  value={row.topic_content || ""} 
                                  onChange={(e) => handleTextUpdate(index, 'topic_content', e.target.value)}
                                  className="bg-transparent text-center border-b border-indigo-200 focus:border-indigo-500 outline-none placeholder-indigo-300 min-w-[300px]"
                                  placeholder="REVISION & ASSESSMENT"
                               /> ---
                        </td>
                    </>
                  ) : (
                    /* 🆕 Dynamic Desktop Cells */
                    columns.map(col => {
                        if (col.key === 'week') {
                            return (
                                <td key={col.key} className="border border-slate-200 p-2 text-center align-top font-bold text-slate-900 bg-slate-50/50 relative">
                                  <input 
                                     value={row.week || ""} 
                                     onChange={(e) => handleTextUpdate(index, 'week', e.target.value)}
                                     className="w-full text-center bg-transparent border-none outline-none font-bold" 
                                  />
                                  {/* 🆕 Row Actions nested inside Wk column */}
                                  <div className="flex justify-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                     <button onClick={() => handleInsertRow(index)} title="Add Row Below" className="p-1 text-indigo-500 hover:bg-indigo-100 rounded"><Plus size={14} /></button>
                                     <button onClick={() => handleDeleteRow(index)} title="Delete Row" className="p-1 text-rose-500 hover:bg-rose-100 rounded"><Trash2 size={14} /></button>
                                  </div>
                                </td>
                            );
                        }
                        if (col.key === 'date_range') {
                            return (
                                <td key={col.key} className="border border-slate-200 p-0 align-top text-slate-500 font-mono text-[10px]">
                                   <textarea 
                                     value={row.date_range || ""} 
                                     onChange={(e) => handleTextUpdate(index, 'date_range', e.target.value)}
                                     className="w-full h-full min-h-[80px] p-2 text-center bg-transparent border-none outline-none resize-none focus:bg-slate-50 break-words"
                                   />
                                </td>
                            );
                        }
                        if (col.key === 'topic_content') {
                            return (
                                <td key={col.key} className="border border-slate-200 p-0 align-top text-slate-700">
                                   <textarea 
                                     value={row.topic_content || ""} 
                                     onChange={(e) => handleTextUpdate(index, 'topic_content', e.target.value)}
                                     className="w-full h-full min-h-[80px] p-2 font-medium bg-transparent border-none outline-none resize-none focus:bg-slate-50 break-words"
                                   />
                                </td>
                            );
                        }
                        // Default Array cell rendering for outcomes, methods, custom columns, etc.
                        return (
                            <td key={col.key} className={`border border-slate-200 p-0 align-top ${col.key === 'references' ? 'text-[10px] text-slate-500' : 'text-slate-600'}`}>
                               <EditableArrayCell value={row[col.key]} onChange={(val) => handleArrayUpdate(index, col.key, val)} />
                            </td>
                        );
                    })
                  )}
                </tr>
              )})
            )}
            
            {/* 🆕 DESKTOP ADD BUTTONS at the bottom of the table */}
            <tr className="print:hidden">
              <td colSpan={columns.length} className="p-4 bg-white border border-slate-200 text-center">
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

      <div className="p-4 sm:p-8 md:p-12 grid grid-cols-2 gap-4 sm:gap-8 md:gap-24 print:break-inside-avoid mt-8">
        <div className="border-t-2 border-slate-900 pt-3 text-center md:text-left">
          <p className="font-black text-[8px] sm:text-[10px] uppercase tracking-tighter text-slate-900">Teacher's Signature</p>
          <p className="text-[8px] sm:text-[10px] text-slate-400 mt-2 font-mono">DATE: ____/____/202__</p>
        </div>
        <div className="border-t-2 border-slate-900 pt-3 text-center md:text-right">
          <p className="font-black text-[8px] sm:text-[10px] uppercase tracking-tighter text-slate-900">Department Head / Supervisor</p>
          <p className="text-[8px] sm:text-[10px] text-slate-400 mt-2 font-mono">STAMP/DATE: ____/____/202__</p>
        </div>
      </div>
    </div>
  );
};

export default SchemesOfWork;