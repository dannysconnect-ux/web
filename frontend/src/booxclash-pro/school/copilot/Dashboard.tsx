import { useState } from 'react';
import { Camera, Mic, LayoutGrid, Users, BarChart2 } from 'lucide-react';
import BatchScanner from './BatchScanner';
import OralQueue from './OralQueue';
import RecordSheet from './RecordSheet';
import SchoolSummary from './SchoolSummary';
// import SchoolSummary from './SchoolSummary'; // <-- Import your new component here

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'record-sheet' | 'school-summary'>('dashboard');
  const [showBatchScanner, setShowBatchScanner] = useState(false);
  const [showOralQueue, setShowOralQueue] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col items-center">
      
      {/* Minimal Floating Navigation */}
      <nav className="mt-8 mb-16 bg-white shadow-sm border border-gray-100 rounded-full p-1.5 flex gap-1 z-10">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <LayoutGrid size={18} />
          <span>Hub</span>
        </button>
        <button 
          onClick={() => setActiveTab('record-sheet')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'record-sheet' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users size={18} />
          <span>Record Sheet</span>
        </button>
        <button 
          onClick={() => setActiveTab('school-summary')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'school-summary' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BarChart2 size={18} />
          <span>School Summary</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl px-6 pb-20">
        
        {/* DASHBOARD VIEW - The Two Core Actions */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col sm:flex-row gap-8 w-full justify-center">
            
            <button 
              onClick={() => setShowBatchScanner(true)}
              className="flex flex-col items-center justify-center w-64 h-64 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 group"
            >
              <div className="bg-blue-50 text-blue-600 p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Camera size={44} strokeWidth={1.5} />
              </div>
              <span className="text-xl font-medium text-gray-700">Scan Written Work</span>
            </button>

            <button 
              onClick={() => setShowOralQueue(true)}
              className="flex flex-col items-center justify-center w-64 h-64 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 group"
            >
              <div className="bg-purple-50 text-purple-600 p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <Mic size={44} strokeWidth={1.5} />
              </div>
              <span className="text-xl font-medium text-gray-700">Oral Assessment</span>
            </button>

          </div>
        )}

        {/* RECORD SHEET VIEW */}
        {activeTab === 'record-sheet' && (
          <div className="w-full animate-in fade-in duration-500">
             <RecordSheet /> 
          </div>
        )}

        {/* SCHOOL SUMMARY VIEW */}
        {activeTab === 'school-summary' && (
          <div className="w-full animate-in fade-in duration-500">
            <SchoolSummary /> 
          </div>
        )}

      </main>

      {/* Background Modals */}
      {showBatchScanner && (
        <BatchScanner 
          onClose={() => setShowBatchScanner(false)} 
          onBatchComplete={() => {}} 
        />
      )}

      {showOralQueue && (
        <OralQueue 
          onClose={() => setShowOralQueue(false)} 
          onStudentComplete={() => {}} 
        />
      )}

    </div>
  );
}