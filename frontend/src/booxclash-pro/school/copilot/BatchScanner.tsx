import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, X, Layers, Loader2 } from 'lucide-react';

interface BatchScannerProps {
  onClose: () => void;
  onBatchComplete: (count: number) => void;
}

const BatchScanner: React.FC<BatchScannerProps> = ({ onClose, onBatchComplete }) => {
  const webcamRef = useRef<Webcam>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [flash, setFlash] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImages(prev => [...prev, imageSrc]);
      // Screen flash effect for feedback
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    }
  }, [webcamRef]);

  const handleFinish = async () => {
    if (images.length === 0) return;
    setIsUploading(true);
    
    // MOCK UPLOAD TO FASTAPI: 
    // In production, you would POST the `images` array to /v1/assess/numeracy/batch here.
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    
    setIsUploading(false);
    onBatchComplete(images.length);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800 text-white">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Batch Scanner Mode</h2>
            <p className="text-xs text-gray-400">{images.length} papers in current batch</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
          <X size={28} />
        </button>
      </div>

      {/* Camera View */}
      <div className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center ${flash ? 'opacity-30' : 'opacity-100'}`}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }} // Uses back camera on mobile
          className="w-full h-full object-cover"
        />
        {/* Alignment Guide */}
        <div className="absolute inset-10 border-2 border-dashed border-blue-500/50 rounded-2xl pointer-events-none flex flex-col items-center justify-center">
          <span className="bg-black/50 text-blue-300 text-sm font-bold tracking-widest uppercase px-4 py-2 rounded-full backdrop-blur-sm">
            Align Paper Here
          </span>
        </div>
      </div>

      {/* Controls Footer */}
      <div className="bg-gray-900 p-6 flex justify-between items-center pb-10">
        {/* Counter / Finish Button */}
        <div className="w-24">
          {images.length > 0 && (
            <button 
              onClick={handleFinish} 
              disabled={isUploading}
              className="flex flex-col items-center justify-center w-full text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={32} className="animate-spin" /> : <CheckCircle size={32} />}
              <span className="text-xs font-bold mt-1 uppercase tracking-wider">
                {isUploading ? "Grading..." : `Grade ${images.length}`}
              </span>
            </button>
          )}
        </div>

        {/* Capture Button */}
        <button 
          onClick={capture} 
          disabled={isUploading}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 active:bg-white/40 transition-all hover:scale-105"
        >
          <Camera size={36} color="white" />
        </button>

        {/* Placeholder to balance flexbox */}
        <div className="w-24"></div>
      </div>
    </div>
  );
};

export default BatchScanner;