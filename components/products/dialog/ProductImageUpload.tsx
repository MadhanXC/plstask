"use client";

import { useState, useRef, MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductImage } from "@/types/product";
import { CameraCapture } from "../CameraCapture";
import { ImagePreview } from "../ImagePreview";

interface ProductImageUploadProps {
  productImages: ProductImage[];
  existingImages: string[];
  isDisabled: boolean;
  onImagesChange: (images: ProductImage[]) => void;
  onExistingImagesChange: (images: string[]) => void;
}

export function ProductImageUpload({
  productImages,
  existingImages,
  isDisabled,
  onImagesChange,
  onExistingImagesChange,
}: ProductImageUploadProps) {
  const { toast } = useToast();
  const [imageSource, setImageSource] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      const totalImages = productImages.length + existingImages.length;
      const remainingSlots = 5 - totalImages;
      
      if (files.length > remainingSlots) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "A maximum of 5 images can be uploaded",
        });
        return;
      }

      const newImages = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      onImagesChange([...productImages, ...newImages]);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      onExistingImagesChange(existingImages.filter((_, i) => i !== index));
    } else {
      const newImages = [...productImages];
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
    <div className="space-y-4">
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
        <div className="mt-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            multiple
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            disabled={isDisabled}
          />
        </div>
      )}
      
      {imageSource === "camera" && (
        <div className="mt-2">
          <CameraCapture
            videoRef={videoRef}
            canvasRef={canvasRef}
            streamRef={streamRef}
            isCameraActive={isCameraActive}
            setIsCameraActive={setIsCameraActive}
            onPhotoCapture={(file) => {
              onImagesChange([...productImages, {
                file,
                preview: URL.createObjectURL(file)
              }]);
            }}
            disabled={isDisabled}
          />
        </div>
      )}

      <ImagePreview
        existingImages={existingImages}
        newImages={productImages}
        onRemove={isDisabled ? undefined : removeImage}
      />
    </div>
  );
}