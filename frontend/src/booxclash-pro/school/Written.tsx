import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Camera, X, Loader2, CheckCircle2, 
  AlertCircle, Plus, Trash2, FileImage 
} from 'lucide-react';

const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8000';

interface ScannedDocument {
  id: string;
  blob: Blob;
  previewUrl: string;
  studentName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: any;
  error?: string;
}

export default function WrittenAssessment() {
  const navigate = useNavigate();
  
  // App States
  const [mode, setMode] = useState<'setup' | 'camera' | 'review' | 'processing' | 'results'>('setup');
  const [scans, setScans] = useState<ScannedDocument[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // 📸 CAMERA LOGIC
  // ==========================================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Uses rear camera on mobile
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
    } catch (err) {
      alert("Camera access denied or unavailable. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const newScan: ScannedDocument = {
              id: Math.random().toString(36).substring(7),
              blob: blob,
              previewUrl: URL.createObjectURL(blob),
              studentName: '',
              status: 'pending'
            };
            setScans(prev => [...prev, newScan]);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ==========================================
  // 🚀 BATCH PROCESSING LOGIC
  // ==========================================
  const handleUpdateName = (id: string, name: string) => {
    setScans(prev => prev.map(s => s.id === id ? { ...s, studentName: name } : s));
  };

  const handleRemoveScan = (id: string) => {
    setScans(prev => prev.filter(s => s.id !== id));
  };

  const processBatch = async () => {
    // Validation: Ensure all scans have names
    const missingNames = scans.filter(s => !s.studentName.trim());
    if (missingNames.length > 0) {
      alert(`Please enter a student name for all ${scans.length} scanned documents before processing.`);
      return;
    }

    setMode('processing');
    setProgress({ current: 0, total: scans.length });

    // Process sequentially to avoid rate-limiting the Gemini Vision API
    for (let i = 0; i < scans.length; i++) {
      const scan = scans[i];
      setProgress({ current: i + 1, total: scans.length });
      
      // Update individual status to processing
      setScans(prev => prev.map(s => s.id === scan.id ? { ...s, status: 'processing' } : s));

      const formData = new FormData();
      formData.append('image', scan.blob, 'worksheet.jpg');
      formData.append('studentName', scan.studentName);
      formData.append('toolId', 'Basic Numeracy Assessment Tool-1');

      try {
        const response = await fetch(`${API_BASE}/api/assessments/written`, {
          method: 'POST',
          headers: {
              'X-School-ID': localStorage.getItem('schoolId') || '',
              'X-User-ID': localStorage.getItem('teacherDocId') || ''
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to grade');
        const data = await response.json();

        setScans(prev => prev.map(s => 
          s.id === scan.id ? { ...s, status: 'success', result: data } : s
        ));
      } catch (err: any) {
        setScans(prev => prev.map(s => 
          s.id === scan.id ? { ...s, status: 'error', error: err.message } : s
        ));
      }
    }

    setMode('results');
  };

  // ==========================================
  // 🎨 RENDERERS
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f0fff0] text-slate-800 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Universal Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => {
              if (mode === 'camera') { stopCamera(); setMode('setup'); }
              else if (mode === 'review') setMode('setup');
              else navigate(-1);
            }} 
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Batch Written Assessment</h1>
            <p className="text-slate-600">Scan and grade multiple worksheets at once.</p>
          </div>
        </div>

        {/* 1. SETUP / DASHBOARD MODE */}
        {mode === 'setup' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
            <div className="p-6 bg-[#6c2dc7]/10 text-[#6c2dc7] rounded-full inline-block mb-6">
              <Camera size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Scan</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Use your device camera to rapidly capture student worksheets. The AI will mark them automatically.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={startCamera}
                className="bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
              >
                <Camera size={20} /> Open Scanner
              </button>
              {scans.length > 0 && (
                <button 
                  onClick={() => setMode('review')}
                  className="bg-white border-2 border-slate-200 hover:border-[#6c2dc7] text-slate-700 font-bold py-4 px-8 rounded-xl transition-all flex justify-center items-center gap-2"
                >
                  <FileImage size={20} /> View {scans.length} Scans
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. LIVE CAMERA MODE */}
        {mode === 'camera' && (
          <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-[60vh] object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Overlay UI */}
            <div className="absolute inset-0 border-4 border-[#ffa500]/50 m-8 rounded-2xl pointer-events-none"></div>
            
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#ffa500]" />
              {scans.length} Captured
            </div>

            <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
              <button 
                onClick={() => { stopCamera(); setMode('setup'); }}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
              >
                <X size={24} />
              </button>
              
              <button 
                onClick={captureFrame}
                className="w-20 h-20 bg-[#ffa500] rounded-full border-4 border-white shadow-[0_0_20px_rgba(255,165,0,0.5)] active:scale-95 transition-all"
              />

              <button 
                onClick={() => { stopCamera(); setMode('review'); }}
                className="px-6 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all flex items-center gap-2"
              >
                Done <ArrowLeft className="rotate-180" size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 3. REVIEW BATCH MODE */}
        {mode === 'review' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-bold text-slate-900">Assign Student Names</h2>
              <button 
                onClick={startCamera}
                className="text-sm font-bold text-[#6c2dc7] flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Add More Scans
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scans.map((scan, index) => (
                <div key={scan.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4 animate-in fade-in zoom-in">
                  <img src={scan.previewUrl} alt="Scan" className="w-24 h-32 object-cover rounded-xl border border-slate-200" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document {index + 1}</span>
                        <button onClick={() => handleRemoveScan(scan.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={scan.studentName}
                        onChange={(e) => handleUpdateName(scan.id, e.target.value)}
                        placeholder="Student Name..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6c2dc7] focus:ring-1 focus:ring-[#6c2dc7]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={processBatch}
              className="w-full mt-6 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white font-bold py-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={20} />
              Process {scans.length} Documents Now
            </button>
          </div>
        )}

        {/* 4. PROCESSING LOADER MODE */}
        {mode === 'processing' && (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 size={64} className="text-[#ffa500] animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI is Grading...</h2>
            <p className="text-slate-500 font-bold mb-8">
              Document {progress.current} of {progress.total}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full max-w-md h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#6c2dc7] transition-all duration-500 ease-out"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 5. BATCH RESULTS MODE */}
        {mode === 'results' && (
          <div className="space-y-6">
            <div className="bg-green-100 text-green-800 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <div>
                <h3 className="font-bold text-green-900">Batch Processing Complete</h3>
                <p className="text-sm">Successfully graded {scans.filter(s => s.status === 'success').length} out of {scans.length} documents.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scans.map((scan) => (
                <div key={scan.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex gap-4 mb-4">
                    <img src={scan.previewUrl} alt="Scan" className="w-16 h-20 object-cover rounded-lg border border-slate-200" />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg">{scan.studentName}</h3>
                      {scan.status === 'success' && scan.result ? (
                        <p className="text-sm font-bold text-[#ffa500]">Level: {scan.result.final_grade || "Requires Review"}</p>
                      ) : (
                        <p className="text-sm font-bold text-red-500">Failed to grade</p>
                      )}
                    </div>
                  </div>
                  
                  {scan.status === 'success' && scan.result && (
                    <div className="bg-slate-50 p-3 rounded-xl flex-1">
                      <p className="text-xs text-slate-500 font-bold mb-1">Score: {scan.result.correct_count} / {scan.result.total_expected}</p>
                      <p className="text-sm text-slate-700 line-clamp-3">{scan.result.feedback}</p>
                    </div>
                  )}

                  {scan.status === 'error' && (
                    <div className="bg-red-50 p-3 rounded-xl flex-1 text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      {scan.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setScans([]); setMode('setup'); }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-md"
            >
              Export Records & Start New Batch
            </button>
          </div>
        )}

      </div>
    </div>
  );
}