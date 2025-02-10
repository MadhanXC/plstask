"use client";

import { X } from "lucide-react";
import { ProductImage } from "@/types/product";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImagePreviewProps {
  existingImages: string[];
  newImages: ProductImage[];
  onRemove?: (index: number, isExisting: boolean) => void;
  readonly?: boolean;
  disabled?: boolean;
  maxImages?: number;
}

export function ImagePreview({ 
  existingImages, 
  newImages, 
  onRemove, 
  readonly,
  disabled,
  maxImages = 5 
}: ImagePreviewProps) {
  if (existingImages.length === 0 && newImages.length === 0) {
    return null;
  }

  const totalImages = existingImages.length + newImages.length;

  return (
    <div className="space-y-4">
      {existingImages.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Existing Images</h3>
            {!readonly && <span className="text-sm text-gray-500">
              {totalImages}/{maxImages} images
            </span>}
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 gap-2">
              {existingImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Existing ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {!readonly && !disabled && onRemove && (
                    <button
                      onClick={() => onRemove(index, true)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {newImages.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">
              {readonly ? "New Images" : `New Images`}
            </h3>
            {!readonly && <span className="text-sm text-gray-500">
              {totalImages}/{maxImages} images
            </span>}
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 gap-2">
              {newImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {!readonly && !disabled && onRemove && (
                    <button
                      onClick={() => onRemove(index, false)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}