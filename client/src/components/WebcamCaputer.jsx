// WebcamCapture.jsx - Ultra-simplified version
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';

const WebcamCapture = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Single function to handle everything
  const initializeCamera = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      console.log('Starting camera initialization...');
      setCameraStarted(false);
      setError(null);

      // Get camera stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      console.log('Got media stream:', mediaStream);
      setStream(mediaStream);

      // Wait a moment for React to render, then set up video
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        console.log('Setting up video element...');
        const video = videoRef.current;
        
        // Simple, direct approach
        video.srcObject = mediaStream;
        video.play().then(() => {
          console.log('Video playing successfully');
          setCameraStarted(true);
        }).catch(err => {
          console.log('Play failed, but continuing:', err);
          setCameraStarted(true); // Sometimes play fails but video still works
        });
      }

    } catch (error) {
      console.error('Camera initialization failed:', error);
      setError(`Failed to start camera: ${error.message}`);
    }
  }, [isOpen]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraStarted(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame (mirrored)
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Convert to blob and create preview
    canvas.toBlob((blob) => {
      setCapturedImage(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
  }, []);

  const retakePhoto = () => setCapturedImage(null);

  const confirmPhoto = () => {
    if (!canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], `webcam-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      onCapture(file);
      handleClose();
    }, 'image/jpeg', 0.9);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, initializeCamera]);

  // Video ref callback to ensure element exists before setting stream
  const videoRefCallback = useCallback((element) => {
    videoRef.current = element;
    if (element && stream && !cameraStarted) {
      console.log('Video element mounted, setting stream...');
      element.srcObject = stream;
      element.play().catch(console.log);
      setCameraStarted(true);
    }
  }, [stream, cameraStarted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Take Profile Picture</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={initializeCamera}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full aspect-video object-cover" />
          ) : (
            <>
              <video
                ref={videoRefCallback}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover bg-gray-800"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraStarted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                  <span className="text-white text-sm">Loading camera...</span>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-center space-x-4 mt-4">
          {capturedImage ? (
            <>
              <button
                onClick={retakePhoto}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                <span>Use Photo</span>
              </button>
            </>
          ) : (
            <button
              onClick={capturePhoto}
              disabled={!cameraStarted}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;