import React, { useState, useEffect } from 'react';

// Centralized API BASE so we don't get 404 errors!
const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://web-938159032176.us-central1.run.app'); // Update this to your real backend URL if needed

// ==========================================
// 1. AI ARCHITECT COMPONENT
// ==========================================
const AIArchitectTab: React.FC = () => {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '🤖 Architect online. What part of the Booxclash codebase should we work on?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState(''); // NEW: Tracks live file reading

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const userMessage = input;
    setInput('');
    setIsLoading(true);
    setLiveStatus('Connecting to Architect...');

    // NEW: Start a loop to check the backend status every 500ms
    const statusInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/internal-agent/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== 'Idle') {
            setLiveStatus(data.status);
          }
        }
      } catch (err) {
        // silently fail if network blips
      }
    }, 500);

    try {
      const response = await fetch(`${API_BASE}/api/internal-agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) throw new Error("Backend returned an error");
      
      const data = await response.json();
      
      // Append the time taken to the bottom of the message
      const replyWithTime = data.time_taken 
        ? `${data.reply}\n\n⏱️ Task completed in ${data.time_taken}s` 
        : data.reply;
        
      setMessages(prev => [...prev, { role: 'agent', text: replyWithTime }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: '⚠️ Connection to backend lost. Is FastAPI running on port 8000?' }]);
    } finally {
      clearInterval(statusInterval); // Stop checking status
      setIsLoading(false);
      setLiveStatus('');
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-900 rounded-lg border border-gray-700 font-mono">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
              <pre className="whitespace-pre-wrap font-sans text-sm">{msg.text}</pre>
            </div>
          </div>
        ))}
        {/* NEW: Displays the live file reading status! */}
        {isLoading && (
          <div className="flex items-center gap-2 text-green-400 text-sm ml-2 mt-4">
            <span className="animate-spin text-lg">⚙️</span>
            <span className="animate-pulse">{liveStatus}</span>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the architect..."
          disabled={isLoading}
          className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold transition-colors disabled:opacity-50">
          Ask
        </button>
      </form>
    </div>
  );
};

// ==========================================
// 2. SALES AGENT COMPONENT
// ==========================================
interface CSVSchool {
  title: string;
  email: string;
  phone: string;
}

const SalesAgentTab: React.FC = () => {
  const [schools, setSchools] = useState<CSVSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<CSVSchool | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  
  // Added time_taken to the state
  const [pitchData, setPitchData] = useState<{email?: string, whatsapp?: string, facebook?: string, time_taken?: number} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);

  // Fetch the CSV data on load
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sales/schools`);
        if (res.ok) {
          const data = await res.json();
          setSchools(data.schools || []);
        }
      } catch (err) {
        console.error("Failed to load CSV schools", err);
      } finally {
        setIsLoadingCSV(false);
      }
    };
    loadSchools();
  }, []);

  const generatePitch = async (school: CSVSchool | string) => {
    const schoolName = typeof school === 'string' ? school : school.title;
    if (!schoolName) return;
    
    if (typeof school !== 'string') {
        setSelectedSchool(school);
        setManualInput(school.title);
    } else {
        setSelectedSchool(null);
    }
    
    setIsGenerating(true);
    setPitchData(null); // Clear old pitch

    try {
      const response = await fetch(`${API_BASE}/api/sales/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_name: schoolName }),
      });
      const data = await response.json();
      setPitchData(data);
    } catch (error) {
      console.error("Failed to generate pitch", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to open default email client
  const handleSendEmail = () => {
    if (!pitchData?.email || !selectedSchool?.email) return;
    
    // Split the Gemini output into Subject and Body
    const parts = pitchData.email.split('\n\n');
    const subject = parts[0].replace('Subject: ', '').trim();
    const body = parts.slice(1).join('\n\n').trim();
    
    const mailtoLink = `mailto:${selectedSchool.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="flex h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm text-gray-800 overflow-hidden">
      
      {/* LEFT COLUMN: School List from CSV */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="font-bold text-gray-800">Scraped Leads</h3>
          <p className="text-xs text-gray-500">{schools.length} schools found in CSV</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoadingCSV ? (
            <div className="text-center text-gray-400 text-sm p-4 animate-pulse">Loading CSV...</div>
          ) : schools.length === 0 ? (
            <div className="text-center text-gray-400 text-sm p-4">No schools found in schools.csv</div>
          ) : (
            schools.map((school, idx) => (
              <button
                key={idx}
                onClick={() => generatePitch(school)}
                className={`w-full text-left p-3 rounded border transition-all ${
                  selectedSchool?.title === school.title 
                    ? 'bg-green-50 border-green-500 ring-1 ring-green-500' 
                    : 'bg-white border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-800 truncate">{school.title}</div>
                {(school.email || school.phone) && (
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    {school.email && <span>📧 Yes</span>}
                    {school.phone && <span>📱 Yes</span>}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Pitch Generator Results */}
      <div className="w-2/3 flex flex-col bg-gray-50">
        {/* Manual Input Fallback */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); generatePitch(manualInput); }} 
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Or type a school name manually..."
              className="flex-1 border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-green-500"
            />
            <button type="submit" disabled={isGenerating || !manualInput} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm font-bold transition-colors disabled:opacity-50">
              {isGenerating ? 'Drafting...' : 'Generate AI Pitch'}
            </button>
          </form>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-green-600 font-bold space-y-4">
              <span className="animate-spin text-4xl">⚙️</span>
              <span className="animate-pulse">Gemini is writing the perfect pitch...</span>
            </div>
          ) : !pitchData ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a lead from the left to generate targeted B2B copy.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* NEW: Display Time Taken */}
              {pitchData.time_taken && (
                <div className="text-right text-xs font-mono text-gray-400 mb-2">
                  ⏱️ Generated in {pitchData.time_taken}s
                </div>
              )}

              {/* Email Section */}
              <div className="bg-white p-4 rounded border border-gray-200 shadow-sm relative group">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-blue-600 flex items-center gap-1">✉️ Cold Email</h4>
                  <div className="flex gap-2">
                    {/* NEW: 1-Click Send Button */}
                    {selectedSchool?.email && (
                        <button onClick={handleSendEmail} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold shadow-sm transition-colors">
                            Send via Mail
                        </button>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(pitchData.email || '')} className="text-xs bg-gray-100 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold transition-colors">Copy</button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{pitchData.email}</pre>
              </div>

              {/* WhatsApp Section */}
              <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-green-600">📱 WhatsApp Bridge</h4>
                  <button onClick={() => navigator.clipboard.writeText(pitchData.whatsapp || '')} className="text-xs bg-gray-100 hover:bg-green-100 text-green-700 px-2 py-1 rounded font-bold transition-colors">Copy</button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{pitchData.whatsapp}</pre>
              </div>
              
              {/* Facebook Section */}
              <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-indigo-600">📘 Facebook Post</h4>
                  <button onClick={() => navigator.clipboard.writeText(pitchData.facebook || '')} className="text-xs bg-gray-100 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold transition-colors">Copy</button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{pitchData.facebook}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// ==========================================
// 3. MAIN DASHBOARD CONTAINER
// ==========================================
export default function InternalCommandCenter() {
  const [activeTab, setActiveTab] = useState<'architect' | 'sales'>('architect'); // Start on architect

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Booxclash AI Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Management & Operations</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('architect')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'architect' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🛠️ AI Architect
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'sales' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📈 Sales Engine
          </button>
        </div>
      </div>

      {/* Render Active Tab */}
      <div className="transition-all duration-300 shadow-xl">
        {activeTab === 'architect' ? <AIArchitectTab /> : <SalesAgentTab />}
      </div>
    </div>
  );
}