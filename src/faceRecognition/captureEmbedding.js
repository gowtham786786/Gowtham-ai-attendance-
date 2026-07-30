import * as faceapi from 'face-api.js';

export const getFaceEmbedding = async (videoElement) => {
  if (!videoElement) return null;

  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null; // No face detected
  }

  // Ensure confidence > 50%
  if (detection.detection.score < 0.5) {
    return null;
  }

  return detection.descriptor; // Float32Array (128-D)
};
