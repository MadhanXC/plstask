"use client";

import { MutableRefObject, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Maximize2, Minimize2, X } from "lucide-react"; // Added X import
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  streamRef: MutableRefObject<MediaStream | null>;
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
  onPhotoCapture: (file: File) => void;
  disabled?: boolean;
}

export function CameraCapture({
  videoRef,
  canvasRef,
  streamRef,
  isCameraActive,
  setIsCameraActive,
  onPhotoCapture,
  disabled
}: CameraCaptureProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useRef(false);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      isFullscreen.current = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleImageCapture = async () => {
    try {
      // First try the environment-facing camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 2048 },
            height: { ideal: 1536 }
          }
        });
        streamRef.current = stream;
      } catch {
        // If environment camera fails, try any available camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 2048 },
            height: { ideal: 1536 }
          }
        });
        streamRef.current = stream;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setIsCameraActive(true);
        
        // Request fullscreen after a short delay to ensure video is playing
        setTimeout(() => {
          toggleFullscreen();
        }, 100);
      }
    } catch (error: any) {
      let errorMessage = "Could not access camera";
      if (error.name === "NotAllowedError") {
        errorMessage = "Camera access was denied. Please allow camera access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on your device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Camera access is restricted. Please use HTTPS.";
      }
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: errorMessage,
      });
      console.error("Camera error:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `captured-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onPhotoCapture(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9); // Increased quality to 0.9
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    exitFullscreen();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen.current) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  };

  return (
    <div 
      className="space-y-4" 
      ref={containerRef}
      style={{
        width: '100%',
        height: isFullscreen.current ? '100vh' : 'auto'
      }}
    >
      <div className="relative rounded-lg overflow-hidden bg-gray-100 h-full">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isFullscreen.current ? 'rounded-none' : ''}`}
          style={{ 
            display: isCameraActive ? 'block' : 'none',
            maxHeight: isFullscreen.current ? '100vh' : '75vh'
          }}
          playsInline
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        {!isCameraActive ? (
          <div className="p-8 text-center">
            <Button 
              onClick={handleImageCapture} 
              variant="outline" 
              className="w-full"
              disabled={disabled}
            >
              <Camera className="mr-2 h-4 w-4" />
              Open Camera
            </Button>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex justify-between items-center gap-4 max-w-lg mx-auto">
              <Button 
                variant="outline" 
                size="icon"
                className="bg-white hover:bg-gray-100"
                onClick={toggleFullscreen}
              >
                {isFullscreen.current ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button 
                onClick={capturePhoto}
                className="flex-1 bg-white hover:bg-gray-100 text-black"
              >
                Take Photo
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="bg-white hover:bg-gray-100"
                onClick={stopCamera}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
