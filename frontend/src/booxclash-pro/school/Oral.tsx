import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Square, Loader2, Volume2, AlertCircle, RefreshCw } from 'lucide-react';

const WS_BASE = import.meta.env?.VITE_WS_BASE || 'ws://localhost:8000';

export default function OralAssessment() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState<'literacy' | 'numeracy'>('literacy');
  
  const [isRecording, setIsRecording] = useState(false);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [agentLogs, setAgentLogs] = useState<{sender: string, text: string}[]>([]);
  const [currentLevel, setCurrentLevel] = useState("Level 1: Number/Letter Recognition");
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize WebSocket Connection to your main.py Live Route
  const connectWebSocket = () => {
    if (!studentName) {
      alert("Please enter a student name first.");
      return;
    }

    setWsStatus('connecting');
    
    // Connects to the route registered in main.py -> routes/live_oral.py
    const ws = new WebSocket(`${WS_BASE}/ws/assess/live?student=${encodeURIComponent(studentName)}&subject=${subject}`);
    
    ws.onopen = () => {
      setWsStatus('connected');
      setAgentLogs(prev => [...prev, { sender: 'system', text: `Connected to VVOB AI Examiner. Beginning ${subject} assessment.` }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'agent_message') {
          setAgentLogs(prev => [...prev, { sender: 'agent', text: data.message }]);
        } else if (data.type === 'tool_execution' && data.tool === 'submit_grade') {
          // This captures the output from your agent.py tool
          setAgentLogs(prev => [...prev, { sender: 'system', text: `Assessment Update: ${data.result.message}` }]);
          if (data.result.next_level) {
            setCurrentLevel(data.result.next_level);
          }
          if (data.result.final_grade) {
            setCurrentLevel(`Final Result: ${data.result.final_grade}`);
            stopRecording(); // End assessment automatically
          }
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onclose = () => setWsStatus('disconnected');
    wsRef.current = ws;
  };

  const startRecording = async () => {
    if (wsStatus !== 'connected') connectWebSocket();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio blob over WebSocket to be processed by Gemini Live
          wsRef.current.send(event.data);
        }
      };

      // Capture audio chunks every 1 second
      mediaRecorder.start(1000); 
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mediaRecorderRef.current) stopRecording();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f0fff0] text-slate-800 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Oral Assessment</h1>
            <p className="text-slate-600">AI listens to the learner and maps their TaRL level.</p>
          </div>
        </div>

        {/* Config Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Student Name</label>
            <input 
              type="text" 
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              disabled={wsStatus === 'connected'}
              placeholder="e.g., Sarah Mutale" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#ffa500]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Assessment Type</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value as any)}
              disabled={wsStatus === 'connected'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#ffa500]"
            >
              <option value="literacy">Local Language Literacy (Chitonga)</option>
              <option value="numeracy">Basic Numeracy</option>
            </select>
          </div>
        </div>

        {/* Live Interface */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className="text-slate-300 text-sm font-bold">
                {wsStatus === 'connected' ? 'Agent Active' : 'Agent Standby'}
              </span>
            </div>
            <div className="bg-slate-800 px-4 py-1.5 rounded-full text-slate-300 text-sm font-bold flex items-center gap-2">
              <RefreshCw size={14} className={isRecording ? 'animate-spin' : ''} />
              {currentLevel}
            </div>
          </div>

          {/* Transcript / AI Logs */}
          <div className="h-64 overflow-y-auto mb-8 space-y-4 pr-2">
            {agentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                <Volume2 size={40} className="opacity-50" />
                <p>Waiting to start assessment...</p>
              </div>
            ) : (
              agentLogs.map((log, i) => (
                <div key={i} className={`p-4 rounded-2xl max-w-[85%] ${
                  log.sender === 'agent' 
                    ? 'bg-[#6c2dc7] text-white float-left clear-both' 
                    : 'bg-slate-800 text-[#ffa500] float-right clear-both font-mono text-sm'
                }`}>
                  <p>{log.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Controls */}
          <div className="clear-both pt-4 flex justify-center">
            {isRecording ? (
              <button 
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all animate-in zoom-in"
              >
                <Square size={32} fill="currentColor" />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                className="bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 rounded-full p-6 shadow-[0_0_20px_rgba(255,165,0,0.3)] transition-all hover:scale-105"
              >
                <Mic size={32} />
              </button>
            )}
          </div>
          
          {isRecording && (
            <p className="text-center text-slate-400 mt-4 text-sm font-bold animate-pulse">
              Listening to learner...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}