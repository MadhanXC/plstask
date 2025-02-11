"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskImage } from "@/types/task";
import { CameraCapture } from "../../products/CameraCapture";
import { ImagePreview } from "../../products/ImagePreview";

interface TaskImageUploadProps {
  taskImages: TaskImage[];
  existingImages: string[];
  isDisabled: boolean;
  onImagesChange: (images: TaskImage[]) => void;
  onExistingImagesChange: (images: string[]) => void;
}

export function TaskImageUpload({
  taskImages,
  existingImages,
  isDisabled,
  onImagesChange,
  onExistingImagesChange,
}: TaskImageUploadProps) {
  const { toast } = useToast();
  const [imageSource, setImageSource] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      const totalImages = taskImages.length + existingImages.length;
      const remainingSlots = 50 - totalImages;
      
      if (files.length > remainingSlots) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}`,
        });
        return;
      }

      const newImages = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      onImagesChange([...taskImages, ...newImages]);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      onExistingImagesChange(existingImages.filter((_, i) => i !== index));
    } else {
      const newImages = [...taskImages];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      onImagesChange(newImages);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="space-y-3">
      <Select
        value={imageSource}
        onValueChange={(value) => {
          setImageSource(value);
          if (value !== "camera") {
            cleanup();
          }
        }}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose how to add images" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="upload">
            <div className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </div>
          </SelectItem>
          <SelectItem value="camera">
            <div className="flex items-center">
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      {imageSource === "upload" && (
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          multiple
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          disabled={isDisabled}
        />
      )}
      
      {imageSource === "camera" && (
        <CameraCapture
          videoRef={videoRef}
          canvasRef={canvasRef}
          streamRef={streamRef}
          isCameraActive={isCameraActive}
          setIsCameraActive={setIsCameraActive}
          onPhotoCapture={(file) => {
            onImagesChange([...taskImages, {
              file,
              preview: URL.createObjectURL(file)
            }]);
          }}
          disabled={isDisabled}
        />
      )}

      <ImagePreview
        existingImages={existingImages}
        newImages={taskImages}
        onRemove={isDisabled ? undefined : removeImage}
        disabled={isDisabled}
        maxImages={50}
      />
    </div>
  );
}
