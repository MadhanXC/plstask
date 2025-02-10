"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductImage, Product } from "@/types/product";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductBasicForm } from "./ProductBasicForm";
import { ProductWarrantyForm } from "./ProductWarrantyForm";
import { useAuth } from "@/contexts/AuthContext";

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  editingProduct: Product | null;
}

const statusColors = {
  approved: "bg-green-100 text-green-800",
  unapproved: "bg-yellow-100 text-yellow-800"
};

export function ProductDialog({ isOpen, onOpenChange, onSave, editingProduct }: ProductDialogProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  
  const [showPreview, setShowPreview] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [status, setStatus] = useState<'approved' | 'unapproved'>("unapproved");
  const [warranty, setWarranty] = useState({
    type: 'basic' as const,
    duration: 12,
    coverage: [] as string[],
    provider: '',
    terms: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Reset form when editing product changes
  useEffect(() => {
    if (editingProduct) {
      const isApproved = editingProduct.status === 'approved';
      const isDisabled = isApproved && !isAdmin;

      setProductName(editingProduct.name);
      setDescription(editingProduct.description || '');
      setSerialNumber(editingProduct.serialNumber || '');
      if (editingProduct.purchaseDate) {
        try {
          const date = new Date(editingProduct.purchaseDate);
          if (!isNaN(date.getTime())) {
            setPurchaseDate(date.toISOString().split('T')[0]);
          } else {
            setPurchaseDate('');
          }
        } catch (error) {
          console.error("Error parsing purchase date:", error);
          setPurchaseDate('');
        }
      } else {
        setPurchaseDate('');
      }
      setWarranty(editingProduct.warranty);
      setExistingImages(editingProduct.images);
      setStatus(editingProduct.status);

      if (isDisabled) {
        toast({
          title: "Notice",
          description: "This product is approved and cannot be modified",
          duration: 5000,
        });
      }
    } else {
      resetForm();
    }
  }, [editingProduct, isAdmin, toast]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!productName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a product name",
      });
      return;
    }

    if (!editingProduct && productImages.length === 0 && existingImages.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one image",
      });
      return;
    }

    setIsUploading(true);
    try {
      const productData: Partial<Product> = {
        name: productName,
        description,
        serialNumber,
        warranty,
        images: productImages.map(img => img.file),
        existingImages,
        status: isAdmin ? status : 'unapproved',
      };

      if (purchaseDate) {
        try {
          const date = new Date(purchaseDate);
          if (!isNaN(date.getTime())) {
            productData.purchaseDate = date;
          }
        } catch (error) {
          console.error("Error parsing purchase date:", error);
        }
      }

      await onSave(productData);
      
      cleanup();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: editingProduct ? "Failed to update product" : "Failed to add product",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cleanup = () => {
    productImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  };

  const resetForm = () => {
    cleanup();
    setProductImages([]);
    setProductName("");
    setDescription("");
    setSerialNumber("");
    setPurchaseDate("");
    setWarranty({
      type: 'basic',
      duration: 12,
      coverage: [],
      provider: '',
      terms: '',
    });
    setStatus('unapproved');
    setShowPreview(false);
    setExistingImages([]);
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setProductName(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'serialNumber':
        setSerialNumber(value);
        break;
      case 'purchaseDate':
        setPurchaseDate(value);
        break;
      case 'status':
        setStatus(value as 'approved' | 'unapproved');
        break;
    }
  };

  const renderBasicForm = () => {
    const isDisabled = editingProduct?.status === 'approved' && !isAdmin;

    return (
      <div className="space-y-6">
        {isDisabled && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-yellow-700">
              This product is approved and cannot be modified
            </p>
          </div>
        )}

        <ProductBasicForm
          name={productName}
          description={description}
          serialNumber={serialNumber}
          purchaseDate={purchaseDate}
          status={status}
          isAdmin={isAdmin}
          isDisabled={isDisabled}
          onFieldChange={handleFieldChange}
        />
        
        <div className="space-y-4">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Add Images
          </label>
          <ProductImageUpload
            productImages={productImages}
            existingImages={existingImages}
            isDisabled={isDisabled}
            onImagesChange={setProductImages}
            onExistingImagesChange={setExistingImages}
          />
        </div>
      </div>
    );
  };

  const renderAdminForm = () => {
    const isDisabled = editingProduct?.status === 'approved' && !isAdmin;

    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-8 pr-4">
          {renderBasicForm()}
          
          <Separator className="my-6" />
          
          <div className="space-y-6">
            <ProductWarrantyForm
              warranty={warranty}
              isDisabled={isDisabled}
              onWarrantyChange={setWarranty}
            />
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderPreview = () => (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="space-y-6 pr-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <button onClick={() => setShowPreview(false)} className="hover:underline">
            Back to editing
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Details</h3>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <p><strong>Name:</strong> {productName}</p>
              {isAdmin && (
                <>
                  <p><strong>Description:</strong> {description || 'None'}</p>
                  {serialNumber && <p><strong>Serial Number:</strong> {serialNumber}</p>}
                  {purchaseDate && (
                    <p><strong>Purchase Date:</strong> {new Date(purchaseDate).toLocaleDateString()}</p>
                  )}
                  <Badge className={statusColors[status]}>
                    Status: {status}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Warranty Information</h3>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                <p><strong>Type:</strong> {warranty.type.charAt(0).toUpperCase() + warranty.type.slice(1)}</p>
                <p><strong>Duration:</strong> {warranty.duration} months</p>
                {warranty.provider && <p><strong>Provider:</strong> {warranty.provider}</p>}
                {warranty.coverage.length > 0 && (
                  <p><strong>Coverage:</strong> {warranty.coverage.join(', ')}</p>
                )}
                {warranty.terms && (
                  <div>
                    <strong>Terms:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{warranty.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Images</h3>
            <ImagePreview
              existingImages={existingImages}
              newImages={productImages}
              readonly
            />
          </div>
        </div>

        <div className="sticky bottom-0 pt-4 bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={isUploading || (editingProduct?.status === 'approved' && !isAdmin)}
            >
              {isUploading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingProduct ? 'Update' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[600px] h-[calc(100vh-4rem)] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="h-full">
              {isAdmin ? renderAdminForm() : renderBasicForm()}
              
              <div className="sticky bottom-0 pt-4 bg-background">
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!productName.trim() || (editingProduct?.status === 'approved' && !isAdmin)}
                  className="w-full"
                >
                  Review & {editingProduct ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            renderPreview()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}