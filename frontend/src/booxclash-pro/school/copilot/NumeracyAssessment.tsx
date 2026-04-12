import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, ArrowRight, X, Mic, Square, Volume2 } from 'lucide-react';

interface NumeracyAssessmentProps {
  onClose: () => void;
  onAssessmentComplete: (audioData: any, scanCount: number) => void;
}

const NumeracyAssessment: React.FC<NumeracyAssessmentProps> = ({ onClose, onAssessmentComplete }) => {
  // Wizard State
  const [step, setStep] = useState<1 | 2>(1); // 1 = Audio, 2 = Camera
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, ] = useState(1); // For the target number being read
  
  // Camera State
  const webcamRef = useRef<Webcam>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [flash, setFlash] = useState<boolean>(false);

  // --- STEP 1: AUDIO LOGIC ---
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In the real implementation, this will connect to the Gemini Live Audio API
  };

  const completeAudioStep = () => {
    setIsRecording(false);
    setStep(2); // Move to camera step
  };

  // --- STEP 2: CAMERA LOGIC ---
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImages((prev) => [...prev, imageSrc]);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    }
  }, [webcamRef]);

  const handleDone = async () => {
    if (images.length === 0) return;
    setIsUploading(true);
    
    try {
      console.log(`Sending audio and ${images.length} exams to Backend...`);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsUploading(false);
      onAssessmentComplete({ levelReached: audioLevel }, images.length); 
      onClose(); 
    } catch (error) {
      console.error("Upload failed", error);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gray-900 z-10 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
            {step}
          </div>
          <h2 className="text-white font-bold text-lg">
            {step === 1 ? "Number Recognition" : `Scan Operations (${images.length})`}
          </h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full transition">
          <X size={24} />
        </button>
      </div>

      {/* --- STEP 1 UI: AUDIO --- */}
      {step === 1 && (
        <div className="w-full max-w-md flex flex-col items-center justify-center px-6 mt-16">
          <div className="bg-gray-800 p-8 rounded-3xl w-full text-center shadow-xl border border-gray-700">
            <Volume2 size={40} className="text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Listen to Student</h3>
            <p className="text-gray-400 text-sm mb-8">Ask the student to read the numbers for Level {audioLevel}.</p>
            
            {/* The Numbers to Read (Mocking your JSON) */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {['4', '8', '1', '7', '3', '5'].map((num) => (
                <div key={num} className="bg-gray-700 text-white text-2xl font-bold py-4 rounded-xl">
                  {num}
                </div>
              ))}
            </div>

            {/* Record Button */}
            <button 
              onClick={toggleRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all shadow-lg ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {isRecording ? <Square size={32} color="white" fill="white" /> : <Mic size={40} color="white" />}
            </button>
            <p className="mt-4 text-sm text-gray-400 font-medium">
              {isRecording ? "Listening to numbers..." : "Tap to start microphone"}
            </p>
          </div>

          <button 
            onClick={completeAudioStep}
            className="mt-8 bg-white text-gray-900 font-bold py-4 px-8 rounded-full w-full flex items-center justify-center space-x-2 hover:bg-gray-200 transition"
          >
            <span>Proceed to Written Scan</span>
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* --- STEP 2 UI: CAMERA SCANNER --- */}
      {step === 2 && (
        <>
          <div className={`relative w-full max-w-md aspect-[3/4] bg-black overflow-hidden mt-12 rounded-2xl ${flash ? 'opacity-40' : 'opacity-100'}`}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-dashed border-green-400/50 rounded-lg pointer-events-none flex items-center justify-center">
              <span className="text-green-400/50 text-sm font-bold tracking-widest uppercase text-center px-4 bg-black/40 py-2 rounded">
                Align Math Operations
              </span>
            </div>
          </div>

          <div className="absolute bottom-0 w-full p-6 bg-gray-900 flex justify-around items-center pb-10 border-t border-gray-800">
            {images.length > 0 ? (
              <button onClick={handleDone} disabled={isUploading} className="flex flex-col items-center text-green-400 disabled:opacity-50 hover:scale-105 transition-transform">
                <CheckCircle size={32} />
                <span className="text-sm mt-1 font-medium">{isUploading ? "Grading..." : "Finish"}</span>
              </button>
            ) : <div className="w-12"></div>}

            <button onClick={capture} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 active:bg-white/30 transition-all hover:scale-105">
              <Camera size={32} color="white" />
            </button>

            <div className="flex flex-col items-center text-white/50 w-12">
              {images.length > 0 && (
                <>
                  <ArrowRight size={28} />
                  <span className="text-xs mt-1 text-center font-medium">Next</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NumeracyAssessment;