import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Buffer time for playing back incoming audio smoothly
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    // 1. Connect to FastAPI WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    
    ws.onmessage = async (event) => {
      // 2. Handle incoming AI audio
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          // Look for base64 audio data in the ADK event payload
          // (You may need to adjust this path based on the exact ADK event structure)
          const base64Audio = data?.server_content?.model_turn?.parts?.[0]?.inline_data?.data;
          
          if (base64Audio) {
            playAudio(base64Audio);
          }
        } catch (e) {
          console.error("Error parsing AI message", e);
        }
      }
    };

    ws.onclose = () => setIsConnected(false);

    return () => {
      ws.close();
      stopMic();
    };
  }, []);

  // Playback function for AI audio (24kHz PCM)
  const playAudio = async (base64String: string) => {
    if (!audioContextRef.current) return;
    
    // Decode base64 to ArrayBuffer
    const binaryString = window.atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert 16-bit PCM bytes to Float32 for Web Audio API
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }

    // Create an audio buffer (Gemini outputs at 24000Hz)
    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    // Schedule sequential playback
    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Force 16kHz sample rate for the AI model
      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;
      
      await audioCtx.audioWorklet.addModule('/pcm-recorder-processor.js');
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(audioCtx, 'pcm-recorder-processor');
      
      // Send raw mic data to the server as binary
      processor.port.onmessage = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data); // e.data is an ArrayBuffer
        }
      };
      
      source.connect(processor);
      // processor.connect(audioCtx.destination); // Do NOT connect to destination to avoid echo
      
      setIsMicActive(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopMic = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    setIsMicActive(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Voice Assistant</h2>
      <div style={{ padding: '1rem', marginBottom: '2rem', borderRadius: '8px', backgroundColor: isConnected ? '#dcfce7' : '#fee2e2' }}>
        {isConnected ? '🟢 Server Connected' : '🔴 Server Disconnected'}
      </div>

      <button 
        onClick={isMicActive ? stopMic : startMic} 
        disabled={!isConnected}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          borderRadius: '50px',
          border: 'none',
          backgroundColor: isMicActive ? '#ef4444' : '#3b82f6',
          color: 'white',
          cursor: isConnected ? 'pointer' : 'not-allowed',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        {isMicActive ? '🛑 Stop Conversation' : '🎙️ Start Conversation'}
      </button>
      
      {isMicActive && <p style={{ marginTop: '1rem', color: '#6b7280' }}>Listening...</p>}
    </div>
  );
}

export default App;