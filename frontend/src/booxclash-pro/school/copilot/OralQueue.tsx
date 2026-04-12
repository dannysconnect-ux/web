import { useState, useRef, useEffect } from 'react';
import { Mic, X, Loader2, CheckCircle, User, ArrowRight, BrainCircuit } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 

interface OralQueueProps {
  onClose: () => void;
  onStudentComplete: () => void;
}

export default function OralQueue({ onClose, onStudentComplete }: OralQueueProps) {
  const [studentName, setStudentName] = useState('');
  const [sessionState, setSessionState] = useState<'idle' | 'fetching' | 'active' | 'grading' | 'success'>('idle');
  
  // State + Refs (Refs prevent stale closures inside WebSocket callbacks)
  const [steps, setSteps] = useState<any[]>([]);
  const stepsRef = useRef<any[]>([]);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStepIndexRef = useRef<number>(0);
  
  const [finalLevels, setFinalLevels] = useState({ numeracy: "Beginner", literacy: "Beginner" });

  // Real-time Streaming Refs
  const wsRef = useRef<WebSocket | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      cleanupAudio();
    };
  }, []);

  const speak = (text: string, onEndCallback?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    if (onEndCallback) utterance.onend = onEndCallback;
    window.speechSynthesis.speak(utterance);
  };

  const handleStartSession = async () => {
    if (!studentName.trim()) { alert("Please enter the student's name!"); return; }
    setSessionState('fetching');

    try {
      console.log("Fetching dynamic instruments...");
      // Ensure these API endpoints are correct and running
      const numRes = await fetch('http://localhost:8000/api/assessments/numeracy/random');
      const rawNumData = await numRes.json();
      const numData = Array.isArray(rawNumData) ? rawNumData[0] : rawNumData;

      const litRes = await fetch('http://localhost:8000/api/assessments/literacy/random');
      const rawLitData = await litRes.json();
      const litData = Array.isArray(rawLitData) ? rawLitData[0] : rawLitData;

      const generatedSteps: any[] = [];
      numData.parts[0].sections.forEach((sec: any) => generatedSteps.push({ type: 'numeracy', title: sec.level, data: sec.numbers }));
      if (litData.sections.letter_sounds) generatedSteps.push({ type: 'literacy', title: 'Letters', data: litData.sections.letter_sounds });
      if (litData.sections.words) generatedSteps.push({ type: 'literacy', title: 'Words', data: litData.sections.words.map((w:any)=>w.word) });
      if (litData.sections.simple_paragraph) generatedSteps.push({ type: 'literacy', title: 'Paragraph', data: [litData.sections.simple_paragraph] });

      // Update State AND Refs
      setSteps(generatedSteps);
      stepsRef.current = generatedSteps;

      // Find the starting index (Level 3 Numeracy)
      let initialIndex = 0;
      const level3Index = generatedSteps.findIndex(s => s.type === 'numeracy' && s.title.toLowerCase().includes('level 3'));
      if (level3Index !== -1) initialIndex = level3Index;
      
      setCurrentStepIndex(initialIndex);
      currentStepIndexRef.current = initialIndex;

      console.log("🔌 Connecting to Gemini Live WebSocket...");
      const ws = new WebSocket('ws://localhost:8000/ws/assess/live');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🟢 WebSocket Connected!");
        
        const initPayload = { 
          instrument: { numeracy: numData, literacy: litData },
          session_id: studentName 
        };
        console.log("📤 Sending initial Context Payload to Backend:", initPayload);
        
        // This is caught by Phase 1 of our backend!
        ws.send(JSON.stringify(initPayload));
        
        setSessionState('active');
        speak(`Hello ${studentName}. Let's look at some numbers. Please read them out loud.`, () => {
          startStreamingMicrophone();
        });
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          
          // ✨ NEW FRONTEND LOGGING FOR WS EVENTS ✨
          console.log("📥 [WS RAW RECEIVE]:", response);
          
          // This intercepts the tool call sent from the ADK downstream task!
          if (response.type === "GRADE_SUBMITTED") {
            console.log("✅ [GRADE TOOL TRIGGERED]: Frontend received grading payload!", response.payload);
            handleAIDecision(response.payload);
          } else if (response.type === "agent_thought" || response.text) {
            console.log("🧠 [GEMINI THOUGHT/TEXT]:", response);
          } else {
            console.log("🤷‍♂️ [UNKNOWN WS EVENT]:", response);
          }

        } catch (e) {
           console.error("🔴 Error inside WS message handler:", e);
           console.log("Raw Payload that failed to parse:", event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("🔴 WebSocket Error:", error);
        alert("Lost connection to the AI server.");
        setSessionState('idle');
      };

    } catch (error) {
      console.error(error);
      alert("Failed to setup Live Session.");
      setSessionState('idle');
    }
  };

  const startStreamingMicrophone = async () => {
    try {
      console.log("🎤 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isRecordingRef.current = true;

      // ADK uses 16000Hz by default for audio processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const microphone = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      microphone.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input && input.length > 0) {
              const channelData = input[0];
              const pcm16 = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                let s = Math.max(-1, Math.min(1, channelData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              // Send the raw PCM buffer to the main thread
              this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await audioContext.audioWorklet.addModule(workletUrl);
      
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (!isRecordingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        
        // ADK OPTIMIZATION: Send raw ArrayBuffer natively!
        wsRef.current.send(e.data);
      };

      microphone.connect(workletNode);
      workletNode.connect(audioContext.destination);

      const checkSilence = () => {
        if (!isRecordingRef.current) return;
        analyzer.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b) / analyzer.frequencyBinCount;

        if (volume > 10) { 
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          silenceTimerRef.current = window.setTimeout(() => {
            console.log("🤫 Silence detected! Ending turn and triggering Gemini evaluation...");
            cleanupAudio();
            setSessionState('grading');
            
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              
              const endOfTurnPayload = {
                type: "text",
                text: "The learner has finished speaking. You MUST evaluate their audio now using the `submit_grade` tool. Do not reply with plain text."
              };
              
              console.log("🛑 [SENDING END OF TURN COMMAND]:", endOfTurnPayload);
              wsRef.current.send(JSON.stringify(endOfTurnPayload)); 
            }
          }, 3000); 
        }
        requestAnimationFrame(checkSilence);
      };

      checkSilence(); 

    } catch (err) {
      console.error("🔴 Mic error:", err);
    }
  };

  const cleanupAudio = () => {
    isRecordingRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleAIDecision = (payload: any) => {
    const { action, message, next_level, final_grade } = payload;
    console.log(`🤖 AI Decision Action: [${action?.toUpperCase()}]`);
    console.log(`🤖 AI Message: "${message}"`);
    console.log(`🤖 AI Next Step: ${next_level} | Final Grade: ${final_grade}`);
    
    // Always fetch from REF to bypass stale closures
    const currentTask = stepsRef.current[currentStepIndexRef.current];
    
    if (!currentTask) {
      console.error("CRITICAL: currentTask is undefined. Something went out of sync.");
      return;
    }

    // 1. If Gemini reached an end path and gave a final grade
    if (final_grade) {
      setFinalLevels(prev => ({ ...prev, [currentTask.type]: final_grade }));
      
      if (currentTask.type === 'numeracy') {
        const firstLitIndex = stepsRef.current.findIndex(s => s.type === 'literacy');
        if (firstLitIndex !== -1) {
          console.log("➡️ Routing to Literacy Module...");
          setCurrentStepIndex(firstLitIndex);
          currentStepIndexRef.current = firstLitIndex;
          setSessionState('active');
          speak(message, () => startStreamingMicrophone()); 
          return;
        }
      }
      
      backgroundSaveAndFinish();
      return;
    }

    // 2. If Gemini tells us to jump to a specific next level
    if (next_level) {
      const parsedLevelName = next_level.replace(" Assessment", ""); 
      const targetIndex = stepsRef.current.findIndex(s => s.type === currentTask.type && s.title.toLowerCase().includes(parsedLevelName.toLowerCase()));
      
      if (targetIndex !== -1) {
        console.log(`➡️ Jumping to Target Level: ${parsedLevelName}...`);
        setCurrentStepIndex(targetIndex);
        currentStepIndexRef.current = targetIndex;
        setSessionState('active');
        speak(message, () => startStreamingMicrophone());
        return;
      } else {
        console.warn(`⚠️ Warning: AI requested jump to '${next_level}', but it was not found in steps array. Falling back to next linear step.`);
      }
    }

    // 3. Fallback (Linear steps)
    const isLastStep = currentStepIndexRef.current === stepsRef.current.length - 1;
    if (!isLastStep) {
      console.log("➡️ Moving to next linear step.");
      const nextIndex = currentStepIndexRef.current + 1;
      setCurrentStepIndex(nextIndex);
      currentStepIndexRef.current = nextIndex;
      setSessionState('active');
      speak(message, () => startStreamingMicrophone());
    } else {
      backgroundSaveAndFinish();
    }
  };

  const backgroundSaveAndFinish = async () => {
    console.log("💾 Saving assessment to Firebase...");
    speak(`Fantastic work, ${studentName}! Your assessment is complete. You can sit down.`);
    setSessionState('success');
    cleanupAudio();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    try {
      await addDoc(collection(db, "assessments"), {
        name: studentName,
        toolUsed: `Gemini Live API`,
        literacy: finalLevels.literacy, 
        numberRec: finalLevels.numeracy, 
        operationsAddSub: "-",
        operationsMulDiv: "-",
        timestamp: new Date()
      });
      console.log("✅ Save to Firebase successful!");
      onStudentComplete();
    } catch (err) {
      console.error("🔴 Firebase Save error:", err);
    }

    setTimeout(() => {
      setStudentName('');
      setCurrentStepIndex(0);
      currentStepIndexRef.current = 0;
      setFinalLevels({ numeracy: "Beginner", literacy: "Beginner" });
      setSessionState('idle');
    }, 4500);
  };

  const currentTask = steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className={`bg-white w-full transition-all duration-500 rounded-3xl shadow-2xl overflow-hidden relative ${sessionState === 'active' || sessionState === 'grading' ? 'max-w-5xl' : 'max-w-lg'}`}>
        
        <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center"><BrainCircuit className="mr-2" size={24} /> Gemini Live Agent</h2>
            <p className="text-purple-200 text-sm mt-1">Real-time Bidirectional Streaming</p>
          </div>
          <button onClick={onClose} className="p-2 bg-purple-500 hover:bg-purple-700 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8">
          {sessionState === 'idle' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Next Student in Line</label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-4 text-gray-400" />
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Chipo Mwanza" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-purple-500" />
                </div>
              </div>
              <button onClick={handleStartSession} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all text-lg shadow-lg flex justify-center items-center">
                Start Live API Stream <ArrowRight className="ml-2" />
              </button>
            </div>
          )}

          {sessionState === 'fetching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="animate-spin text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Connecting to Gemini...</h3>
            </div>
          )}

          {(sessionState === 'active' || sessionState === 'grading') && currentTask && (
            <div className="flex flex-col md:flex-row gap-8 items-center">
              
              <div className="flex-1 bg-gray-50 rounded-2xl p-8 border-2 border-gray-100 min-h-[300px] w-full">
                <div className="mb-8 flex justify-between items-end border-b border-gray-200 pb-4">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentTask.type === 'numeracy' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {currentTask.type}
                    </span>
                    <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{currentTask.title}</h3>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {currentTask.data.map((item: string, i: number) => (
                    <span key={i} className={`px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold shadow-sm ${currentTask.title === 'Paragraph' ? 'text-2xl leading-relaxed text-left w-full' : 'text-5xl text-center'}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-64 flex flex-col items-center justify-center">
                {sessionState === 'active' ? (
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-purple-100 text-purple-600 rounded-full flex flex-col items-center justify-center animate-pulse shadow-sm border-8 border-white ring-4 ring-purple-50 mb-4 relative">
                      <Mic size={40} className="mb-1" />
                      <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-20"></div>
                    </div>
                    <span className="font-bold text-gray-700">Listening...</span>
                    <p className="text-xs text-gray-400 mt-2 text-center">Will auto-grade on silence.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Loader2 size={48} className="animate-spin text-purple-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Gemini Grading</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {sessionState === 'success' && (
             <div className="flex flex-col items-center justify-center py-12">
               <div className="bg-green-100 text-green-600 p-6 rounded-full mb-6"><CheckCircle size={64} /></div>
               <h3 className="text-3xl font-bold text-gray-900 mb-2">Assessment Complete!</h3>
               <p className="text-xl text-gray-500">Highest levels achieved:</p>
               <div className="flex gap-4 mt-4">
                 <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold">Math: {finalLevels.numeracy}</span>
                 <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-bold">Reading: {finalLevels.literacy}</span>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}