import React, { useState, useEffect } from 'react';
import { Printer, Download, Settings, ArrowRight } from 'lucide-react';

export default function SchoolSummary() {
  const [showModal, setShowModal] = useState(false);
  const [sheetDetails, setSheetDetails] = useState({
    province: '', district: '', zone: '', school: '', emisNo: ''
  });

  useEffect(() => {
    const savedDetails = localStorage.getItem('schoolSummaryDetails');
    if (savedDetails) setSheetDetails(JSON.parse(savedDetails));
    else setShowModal(true);
  }, []);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('schoolSummaryDetails', JSON.stringify(sheetDetails));
    setShowModal(false);
  };

  // Helper arrays to map over the 3 cycles
  const cycles = ["BASELINE", "MIDLINE", "ENDLINE"];
  const grades = [3, 4, 5];

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-[1400px] mx-auto pb-12">
      
      {/* Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-sm w-full animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-medium text-gray-900 mb-8 tracking-tight">Summary Setup</h3>
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <input required type="text" value={sheetDetails.province} onChange={e => setSheetDetails({...sheetDetails, province: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="Province" />
              <input required type="text" value={sheetDetails.district} onChange={e => setSheetDetails({...sheetDetails, district: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="District" />
              <input required type="text" value={sheetDetails.zone} onChange={e => setSheetDetails({...sheetDetails, zone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="Zone" />
              <input required type="text" value={sheetDetails.school} onChange={e => setSheetDetails({...sheetDetails, school: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="School Name" />
              <input required type="text" value={sheetDetails.emisNo} onChange={e => setSheetDetails({...sheetDetails, emisNo: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm" placeholder="School EMIS No." />
              <button type="submit" className="w-full mt-4 bg-gray-900 text-white py-4 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors flex justify-center items-center gap-2">
                Continue <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-end items-center mb-6 gap-2">
        <button onClick={() => setShowModal(true)} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all" title="Edit Details">
          <Settings size={20} />
        </button>
        <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all" title="Print Summary">
          <Printer size={20} />
        </button>
        <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all" title="Export">
          <Download size={20} />
        </button>
      </div>

      {/* Official Summary Sheet Wrapper */}
      <div className="bg-white border-2 border-gray-800 p-2 overflow-x-auto">
        
        {/* Title & Metadata Top Bar */}
        <div className="text-center py-2 border-b-2 border-gray-800 mb-2 relative">
          <h1 className="text-2xl font-bold text-gray-900">Grade 3-5 School Summary Sheet</h1>
        </div>

        <div className="grid grid-cols-5 divide-x-2 divide-gray-800 border-2 border-gray-800 text-sm font-semibold text-gray-800 mb-2">
          <div className="p-2">Province: <span className="font-normal">{sheetDetails.province}</span></div>
          <div className="p-2">District: <span className="font-normal">{sheetDetails.district}</span></div>
          <div className="p-2">Zone: <span className="font-normal">{sheetDetails.zone}</span></div>
          <div className="p-2">School: <span className="font-normal">{sheetDetails.school}</span></div>
          <div className="p-2">School EMIS No: <span className="font-normal">{sheetDetails.emisNo}</span></div>
        </div>

        {/* Master Table */}
        <table className="w-full border-collapse border-2 border-gray-800 text-xs text-center text-gray-900">
          <thead>
            {/* Header Row 1 */}
            <tr className="border-b-2 border-gray-800 divide-x-2 divide-gray-800 bg-gray-50">
              <th rowSpan={3} className="p-2 w-12 border-r border-gray-400">Grade</th>
              <th rowSpan={3} className="p-2 w-32 border-r border-gray-400">Teacher Name(s)</th>
              <th rowSpan={3} className="p-2 w-32 border-r border-gray-400">Teacher Phone Number(s)</th>
              <th rowSpan={3} className="p-2 w-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Assessment Cycle</th>
              <th colSpan={4} className="p-2 border-b border-gray-400">Number of Children Tested</th>
              <th colSpan={16} className="p-2 border-b border-gray-400">LEARNING LEVELS</th>
              <th rowSpan={3} className="p-2 w-16" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Total number of lessons<br/>completed under Catch Up</th>
              <th colSpan={5} className="p-2 border-b border-gray-400">MENTORING VISITS</th>
            </tr>
            {/* Header Row 2 */}
            <tr className="border-b border-gray-400 bg-gray-50">
              {/* Children Tested Sub */}
              <th rowSpan={2} className="p-2 border-l-2 border-gray-800 border-r border-gray-400 w-10 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Number of children enrolled</th>
              <th rowSpan={2} className="p-2 border-r border-gray-400 w-10 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Boys Tested</th>
              <th rowSpan={2} className="p-2 border-r border-gray-400 w-10 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Girls Tested</th>
              <th rowSpan={2} className="p-2 border-r-2 border-gray-800 w-10 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Overall Number of children Tested</th>
              
              {/* Learning Levels Sub */}
              <th colSpan={5} className="p-1 border-r-2 border-gray-800 border-b border-gray-400">Language</th>
              <th colSpan={5} className="p-1 border-r-2 border-gray-800 border-b border-gray-400">Number Recognition</th>
              <th colSpan={6} className="p-1 border-r-2 border-gray-800 border-b border-gray-400">Operations</th>
              
              {/* Mentoring Sub */}
              <th colSpan={5} className="p-1 border-l-2 border-gray-800 border-b border-gray-400">Number of visits by</th>
            </tr>
            {/* Header Row 3 - Vertical Text Headers */}
            <tr className="bg-gray-50 divide-x divide-gray-300">
              {/* Language */}
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Beginner</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Letter</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Word</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Paragraph</th>
              <th className="p-1 h-32 leading-tight border-r-2 border-gray-800" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Story</th>

              {/* Number Recognition */}
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Beginner</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>1-digit (1 to 9)</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>2-digit (10-99)</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>3-digit (100-999)</th>
              <th className="p-1 h-32 leading-tight border-r-2 border-gray-800" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>4-digit (1000 to 9999)</th>

              {/* Operations */}
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Cannot Add and Sub</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Can do Add. But not Sub</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Can do Add And Sub</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Cannot Mul and Div</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Can do Mul. But not Div</th>
              <th className="p-1 h-32 leading-tight border-r-2 border-gray-800" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Can do Mul And Div</th>

              {/* Mentoring */}
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Mentor</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Head teacher/ Deputy<br/>Headteacher</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>ZIC</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>DRCC/FRCC/ Standards</th>
              <th className="p-1 h-32 leading-tight" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>WOB</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-400">
            {cycles.map((cycle, cycleIndex) => (
              <React.Fragment key={cycle}>
                {grades.map((grade, gradeIndex) => (
                  <tr key={`${cycle}-${grade}`} className="divide-x divide-gray-300">
                    <td className="p-2 font-bold border-r border-gray-400">{grade}</td>
                    <td className="p-2 border-r border-gray-400"></td>
                    <td className="p-2 border-r border-gray-400"></td>
                    
                    {/* Print the Cycle name bridging across the rows for this cycle */}
                    {gradeIndex === 0 && (
                      <td rowSpan={4} className="p-2 font-bold tracking-widest border-r-2 border-gray-800 bg-gray-50" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {cycle}
                      </td>
                    )}

                    {/* Children Tested Array */}
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2 border-r-2 border-gray-800"></td>

                    {/* Data Cells (Language, Number Rec, Operations) */}
                    {Array.from({ length: 16 }).map((_, i) => (
                      <td key={`data-${i}`} className={`p-2 ${i === 4 || i === 9 || i === 15 ? 'border-r-2 border-gray-800' : ''}`}></td>
                    ))}

                    {/* Blacked out cells for individual grades (Lessons & Mentoring) */}
                    <td className="bg-gray-800 border-l-2 border-gray-800"></td>
                    <td className="bg-gray-800"></td>
                    <td className="bg-gray-800"></td>
                    <td className="bg-gray-800"></td>
                    <td className="bg-gray-800"></td>
                    <td className="bg-gray-800"></td>
                  </tr>
                ))}
                
                {/* SCHOOL TOTAL Row for this cycle */}
                <tr className="bg-gray-100 divide-x divide-gray-300 border-b-4 border-gray-800 font-bold">
                  <td colSpan={3} className="p-3 text-right uppercase tracking-wider border-r border-gray-400 pr-6">
                    School Total
                  </td>
                  
                  {/* Children Tested Array */}
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2 border-r-2 border-gray-800"></td>

                  {/* Data Cells */}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <td key={`total-data-${i}`} className={`p-2 ${i === 4 || i === 9 || i === 15 ? 'border-r-2 border-gray-800' : ''}`}></td>
                  ))}

                  {/* Open Cells for Total Lessons & Mentoring (Not blacked out here) */}
                  <td className="p-2 bg-white border-l-2 border-gray-800"></td>
                  <td className="p-2 bg-white"></td>
                  <td className="p-2 bg-white"></td>
                  <td className="p-2 bg-white"></td>
                  <td className="p-2 bg-white"></td>
                  <td className="p-2 bg-white"></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}