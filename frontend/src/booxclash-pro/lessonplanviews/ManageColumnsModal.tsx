import { Settings2, X, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { TableColumn } from '../LessonPlanView';

interface ManageColumnsModalProps {
  columns: TableColumn[];
  setColumns: (cols: TableColumn[]) => void;
  onClose: () => void;
}

export default function ManageColumnsModal({ columns, setColumns, onClose }: ManageColumnsModalProps) {
  
  const handleAddColumn = () => {
    const newKey = `custom_${Date.now()}`;
    setColumns([...columns, { key: newKey, label: "NEW COLUMN" }]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings2 size={20} className="text-indigo-600" /> Manage Table Columns
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
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
                  disabled={index === 0 || col.key === 'stage_time'}
                  className="text-slate-300 hover:text-indigo-600 disabled:opacity-30 transition-colors p-1"
                ><ArrowUp size={14} /></button>
                <button 
                  onClick={() => {
                    if (index === columns.length - 1) return;
                    const newCols = [...columns];
                    [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
                    setColumns(newCols);
                  }}
                  disabled={index === columns.length - 1 || col.key === 'stage_time'}
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
                className="flex-1 bg-transparent border-none outline-none font-bold text-xs sm:text-sm text-slate-700 w-full min-w-0"
                disabled={col.key === 'stage_time'} 
              />
              
              <div className="flex opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      const newCols = [...columns];
                      newCols.splice(index + 1, 0, { key: `custom_${Date.now()}`, label: "NEW COLUMN" });
                      setColumns(newCols);
                    }}
                    className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Add column after this one"
                  ><Plus size={16} /></button>

                  {col.key !== 'stage_time' && (
                    <button 
                      onClick={() => setColumns(columns.filter((_, i) => i !== index))}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Column"
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
          <button onClick={onClose} className="w-full py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-black text-xs sm:text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}