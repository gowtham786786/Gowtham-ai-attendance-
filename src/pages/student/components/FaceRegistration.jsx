import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import { FaCamera, FaStopCircle } from 'react-icons/fa';
import { db, storage } from '../../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useStudent } from '../../../context/StudentContext';

const FaceRegistration = ({ onComplete }) => {
  const { studentData } = useStudent();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading models:', err);
        toast.error('Failed to load AI models.');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error(err);
      toast.error('Camera access denied or failed.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
  };

  const captureAndRegister = async () => {
    if (!videoRef.current) return;
    
    setLoading(true);
    try {
      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 });
      const detection = await faceapi.detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected! Please look clearly at the camera.');
        setLoading(false);
        return;
      }

      // Draw to canvas to get image data URL for storage
      if (canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // PREVIEW MODE BYPASS
        if (studentData.id === 'mock-student-123') {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing delay
          toast.success('Preview Mode: Face registered successfully! (Not saved to DB)');
          stopCamera();
          if (onComplete) onComplete(photoDataUrl);
          setLoading(false);
          return;
        }

        // BYPASS FIREBASE STORAGE: Save the Base64 image directly to Firestore to keep it 100% free!
        const downloadURL = photoDataUrl;

        // Save Embedding to Firestore
        const embeddingArray = Array.from(detection.descriptor);
        await setDoc(doc(db, 'face_embeddings', studentData.id), {
          studentId: studentData.id,
          photoURL: downloadURL,
          embedding: embeddingArray,
          registeredAt: serverTimestamp(),
          status: 'registered'
        });

        // Update Student Profile
        await updateDoc(doc(db, 'students', studentData.id), {
          faceRegistered: true,
          facePhotoURL: downloadURL
        });

        toast.success('Face registered successfully!');
        stopCamera();
        if (onComplete) onComplete(downloadURL);
      }
    } catch (err) {
      console.error(err);
      toast.error('Registration failed. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="glass-card p-6 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Face Registration Required</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
        You must register your face to mark attendance. Ensure good lighting and look directly at the camera.
      </p>

      <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-inner min-h-[250px]">
        {!isCameraActive ? (
          <button 
            type="button" 
            onClick={startCamera}
            disabled={!modelsLoaded}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
          >
            <FaCamera /> <span>{modelsLoaded ? 'Start Camera' : 'Loading AI Models...'}</span>
          </button>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="relative rounded-xl overflow-hidden border-4 border-primary/50 shadow-xl">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md h-auto bg-black object-cover transform scale-x-[-1]" />
              <canvas ref={canvasRef} className="hidden" />
              {/* Face scanning guide overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-white/50 m-8 rounded-full pointer-events-none"></div>
            </div>
            
            <div className="flex space-x-4">
              <button 
                type="button"
                onClick={stopCamera}
                className="flex items-center space-x-2 bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaStopCircle /> <span>Cancel</span>
              </button>
              <button 
                type="button"
                onClick={captureAndRegister}
                disabled={loading}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-md transition-all hover:scale-105 disabled:transform-none"
              >
                <FaCamera /> <span>{loading ? 'Processing...' : 'Capture & Register'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRegistration;
