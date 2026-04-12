import React, { useState, useEffect } from 'react';
import { Printer, Download, Check, Loader2, Settings, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase'; 

export default function RecordSheet() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [sheetDetails, setSheetDetails] = useState({
    province: '', district: '', school: '', emisNo: '', cycle: 'Baseline'
  });

  useEffect(() => {
    const savedDetails = localStorage.getItem('schoolDetails');
    if (savedDetails) setSheetDetails(JSON.parse(savedDetails));
    else setShowModal(true);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "assessments"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      setStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('schoolDetails', JSON.stringify(sheetDetails));
    setShowModal(false);
  };

  // Minimal checkmark without the heavy green box
  const renderCheck = (currentLevel: string, targetLevel: string) => {
    if (!currentLevel) return null;
    return currentLevel.toLowerCase().includes(targetLevel.toLowerCase()) ? (
      <div className="flex justify-center text-gray-800">
        <Check size={16} strokeWidth={2.5} />
      </div>
    ) : null;
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
      
      {/* Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-sm w-full animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-medium text-gray-900 mb-8 tracking-tight">Sheet Setup</h3>
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <input required type="text" value={sheetDetails.province} onChange={e => setSheetDetails({...sheetDetails, province: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="Province" />
              <input required type="text" value={sheetDetails.district} onChange={e => setSheetDetails({...sheetDetails, district: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="District" />
              <input required type="text" value={sheetDetails.school} onChange={e => setSheetDetails({...sheetDetails, school: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="School Name" />
              <div className="flex gap-4">
                <input required type="text" value={sheetDetails.emisNo} onChange={e => setSheetDetails({...sheetDetails, emisNo: e.target.value})} className="w-1/2 px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="EMIS No." />
                <select value={sheetDetails.cycle} onChange={e => setSheetDetails({...sheetDetails, cycle: e.target.value})} className="w-1/2 px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm text-gray-500">
                  <option>Baseline</option>
                  <option>Midline</option>
                  <option>Endline</option>
                </select>
              </div>
              <button type="submit" className="w-full mt-4 bg-gray-900 text-white py-4 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors flex justify-center items-center gap-2">
                Continue <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
        <div>
          <h2 className="text-2xl font-medium text-gray-900 tracking-tight">Official Record Sheet</h2>
          <div className="text-sm text-gray-400 mt-2 flex gap-3">
            <span>{sheetDetails.school || "Setup required"}</span> • 
            <span>EMIS: {sheetDetails.emisNo || "---"}</span> • 
            <span>{sheetDetails.cycle}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button onClick={() => setShowModal(true)} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
            <Settings size={20} />
          </button>
          <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
            <Printer size={20} />
          </button>
          <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="w-full overflow-x-auto pb-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={24} />
            <span className="text-sm">Syncing records...</span>
          </div>
        ) : (
          <table className="w-full text-sm text-center whitespace-nowrap border-collapse">
            <thead>
              {/* Category Super-Headers */}
              <tr className="text-gray-400 border-b border-gray-100">
                <th colSpan={2} className="font-medium pb-2 text-left pr-4">Student Info</th>
                <th colSpan={5} className="font-medium pb-2 px-4 border-l border-gray-100">Local Language (Chitonga)</th>
                <th colSpan={5} className="font-medium pb-2 px-4 border-l border-gray-100">Number Recognition</th>
                <th colSpan={6} className="font-medium pb-2 px-4 border-l border-gray-100">Operations</th>
              </tr>
              {/* Sub-Headers */}
              <tr className="text-gray-400 text-xs tracking-wider border-b border-gray-200">
                <th className="font-medium py-3 text-left w-48 align-bottom">Child Name</th>
                <th className="font-medium py-3 text-left w-20 pr-4 align-bottom">Tool No.</th>
                
                {/* Literacy */}
                <th className="font-medium py-3 px-2 border-l border-gray-100 align-bottom">Beginner</th>
                <th className="font-medium py-3 px-2 align-bottom">Letter</th>
                <th className="font-medium py-3 px-2 align-bottom">Word</th>
                <th className="font-medium py-3 px-2 align-bottom">Paragraph</th>
                <th className="font-medium py-3 px-2 align-bottom">Story</th>

                {/* Numeracy */}
                <th className="font-medium py-3 px-2 border-l border-gray-100 align-bottom">Beginner</th>
                <th className="font-medium py-3 px-2 align-bottom">1-digit</th>
                <th className="font-medium py-3 px-2 align-bottom">2-digit</th>
                <th className="font-medium py-3 px-2 align-bottom">3-digit</th>
                <th className="font-medium py-3 px-2 align-bottom">4-digit</th>

                {/* Operations (Updated to match tool) */}
                <th className="font-medium py-3 px-2 border-l border-gray-100 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Cannot do Add. Or Sub.</th>
                <th className="font-medium py-3 px-2 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Can do Add. But not Sub.</th>
                <th className="font-medium py-3 px-2 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Can do Add. And Sub.</th>
                
                <th className="font-medium py-3 px-2 border-l border-gray-100 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Cannot do Mul. Or Div.</th>
                <th className="font-medium py-3 px-2 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Can do Mul. But not Div.</th>
                <th className="font-medium py-3 px-2 align-bottom text-[10px] w-20 whitespace-normal leading-tight">Can do Mul. And Div.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-gray-400 text-sm">
                    No assessments found. Run a student through the kiosk first!
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-3 text-left font-medium text-gray-900">{student.name || "Unknown"}</td>
                    <td className="py-3 text-left text-gray-400 pr-4">{student.toolUsed || "-"}</td>
                    
                    {/* Literacy */}
                    <td className="py-3 px-2 border-l border-gray-50">{renderCheck(student.literacy, "Beginner")}</td>
                    <td className="py-3 px-2">{renderCheck(student.literacy, "Letter")}</td>
                    <td className="py-3 px-2">{renderCheck(student.literacy, "Word")}</td>
                    <td className="py-3 px-2">{renderCheck(student.literacy, "Paragraph")}</td>
                    <td className="py-3 px-2">{renderCheck(student.literacy, "Story")}</td>

                    {/* Numeracy */}
                    <td className="py-3 px-2 border-l border-gray-50">{renderCheck(student.numberRec, "Beginner")}</td>
                    <td className="py-3 px-2">{renderCheck(student.numberRec, "1-digit")}</td>
                    <td className="py-3 px-2">{renderCheck(student.numberRec, "2-digit")}</td>
                    <td className="py-3 px-2">{renderCheck(student.numberRec, "3-digit")}</td>
                    <td className="py-3 px-2">{renderCheck(student.numberRec, "4-digit")}</td>

                    {/* Operations (Add/Sub) */}
                    <td className="py-3 px-2 border-l border-gray-50">{renderCheck(student.operationsAddSub, "Cannot do Add")}</td>
                    <td className="py-3 px-2">{renderCheck(student.operationsAddSub, "But not Sub")}</td>
                    <td className="py-3 px-2">{renderCheck(student.operationsAddSub, "And Sub")}</td>

                    {/* Operations (Mul/Div) */}
                    <td className="py-3 px-2 border-l border-gray-50">{renderCheck(student.operationsMulDiv, "Cannot do Mul")}</td>
                    <td className="py-3 px-2">{renderCheck(student.operationsMulDiv, "But not Div")}</td>
                    <td className="py-3 px-2">{renderCheck(student.operationsMulDiv, "And Div")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}