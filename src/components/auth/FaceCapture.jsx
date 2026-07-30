import { useRef, useEffect, useState, useCallback } from 'react';
import { loadFaceModels } from '../../faceRecognition/loadModels';
import { getFaceEmbedding } from '../../faceRecognition/captureEmbedding';
import { FaCamera, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const REQUIRED_SAMPLES = 40;

const poses = [
  { name: "Front facing", count: 8 },
  { name: "Left turn", count: 6 },
  { name: "Right turn", count: 6 },
  { name: "Look up", count: 4 },
  { name: "Look down", count: 4 },
  { name: "Smile", count: 4 },
  { name: "Normal neutral", count: 4 },
  { name: "Slight rotation", count: 4 }
];

const FaceCapture = ({ onCaptureComplete }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [samplesTaken, setSamplesTaken] = useState(0);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [poseSampleCount, setPoseSampleCount] = useState(0);
  
  const embeddingsRef = useRef([]);
  const referenceImageRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await loadFaceModels();
        if (mounted) setIsLoading(false);
      } catch (err) {
        toast.error(err.message);
      }
    };
    init();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Camera access denied. Cannot proceed with registration.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureSamples = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const captureLoop = setInterval(async () => {
      if (!videoRef.current) return;
      
      const embedding = await getFaceEmbedding(videoRef.current);
      if (embedding) {
        embeddingsRef.current.push(Array.from(embedding));
        
        if (!referenceImageRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          referenceImageRef.current = canvas.toDataURL('image/jpeg', 0.8);
        }

        setSamplesTaken(prev => prev + 1);
        setPoseSampleCount(prev => prev + 1);
      }
    }, 500);

    const checkInterval = setInterval(() => {
      if (embeddingsRef.current.length >= REQUIRED_SAMPLES) {
        clearInterval(captureLoop);
        clearInterval(checkInterval);
        setIsCapturing(false);
        stopCamera();
        processFinalData();
      }
    }, 1000);
  };

  useEffect(() => {
    if (samplesTaken > 0 && samplesTaken < REQUIRED_SAMPLES) {
      const currentPose = poses[currentPoseIndex];
      if (poseSampleCount >= currentPose.count) {
        setCurrentPoseIndex(prev => Math.min(prev + 1, poses.length - 1));
        setPoseSampleCount(0);
      }
    }
  }, [samplesTaken, poseSampleCount, currentPoseIndex]);

  const processFinalData = () => {
    const avgEmbedding = new Array(128).fill(0);
    embeddingsRef.current.forEach(emb => {
      for (let i = 0; i < 128; i++) {
        avgEmbedding[i] += emb[i];
      }
    });
    for (let i = 0; i < 128; i++) {
      avgEmbedding[i] /= REQUIRED_SAMPLES;
    }

    onCaptureComplete({
      embedding: avgEmbedding,
      referenceImage: referenceImageRef.current
    });
    toast.success("Face data captured successfully!");
  };

  if (samplesTaken >= REQUIRED_SAMPLES) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <FaCheckCircle className="text-green-500 text-5xl mb-4" />
        <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Face Data Locked</h3>
        <p className="text-sm text-green-600 dark:text-green-400 mt-2 text-center">
          Successfully captured {REQUIRED_SAMPLES} samples. Your face profile is securely prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-gray-900 aspect-video shadow-inner">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2 bg-gray-800">
            <FaSpinner className="animate-spin text-3xl text-primary" />
            <p className="text-sm">Loading AI Models...</p>
          </div>
        )}
        {!isLoading && !stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-2 bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl">
            <FaCamera className="text-3xl" />
            <p className="text-sm font-medium">Camera Not Started</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className={`w-full h-full object-cover transform scale-x-[-1] ${(isLoading || !stream) ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}
        />
        
        {isCapturing && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-3 border-t border-white/10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-sm font-medium">
                {poses[currentPoseIndex]?.name}
              </span>
              <span className="text-primary-light text-xs font-bold bg-primary/20 px-2 py-1 rounded">
                {samplesTaken} / {REQUIRED_SAMPLES}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(samplesTaken / REQUIRED_SAMPLES) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        {!isLoading && !stream && !isCapturing && (
          <button
            type="button"
            onClick={startCamera}
            className="w-full flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-gray-600"
          >
            <FaCamera />
            <span>Start Camera</span>
          </button>
        )}

        {!isCapturing && stream && (
          <>
            <button
              type="button"
              onClick={captureSamples}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-lg shadow-primary/30"
            >
              <FaCamera />
              <span>Start Face Registration</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <span>Stop Camera</span>
            </button>
          </>
        )}
        
        {isCapturing && (
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 animate-pulse">
            Please follow the on-screen instructions...
          </p>
        )}
        
        <p className="mt-4 text-xs text-center text-red-500 font-medium">
          ⚠️ Warning: Face registration is permanent and cannot be changed later.
        </p>
      </div>
    </div>
  );
};

export default FaceCapture;
