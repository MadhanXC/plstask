"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskImage, Task } from "@/types/task";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { TaskImageUpload } from "./TaskImageUpload";
import { TaskBasicForm } from "./TaskBasicForm";
import { TaskTimeSlots } from "./TaskTimeSlots";

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  editingTask: Task | null;
}

export function TaskDialog({ isOpen, onOpenChange, onSave, editingTask }: TaskDialogProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  
  const [showPreview, setShowPreview] = useState(false);
  const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'in-progress' | 'completed'>('in-progress');
  const [timeSlots, setTimeSlots] = useState<Task['timeSlots']>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Determine if fields should be disabled
  const isCompleted = editingTask?.status === 'completed';
  const isEditing = !!editingTask;
  const isDisabled = isCompleted && !isAdmin;
  const isBasicFieldsDisabled = (isEditing && !isAdmin) || isDisabled;

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setSite(editingTask.site || '');
      setDescription(editingTask.description);
      setNotes(editingTask.notes || '');
      setStatus(editingTask.status);
      setTimeSlots(editingTask.timeSlots || []);
      setExistingImages(editingTask.images);

      if (isDisabled) {
        toast({
          title: "Notice",
          description: "This task is completed and cannot be modified",
        });
      }
    } else {
      resetForm();
      setStatus('in-progress');
    }
  }, [editingTask, isAdmin, toast, isEditing, isDisabled]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a task title",
      });
      return;
    }

    if (!site.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a site location",
      });
      return;
    }

    const timeValidation = validateTimeSlots();
    if (!timeValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: timeValidation.error,
      });
      return;
    }

    setIsUploading(true);
    try {
      await onSave({
        title,
        site,
        description,
        notes,
        status,
        timeSlots,
        images: taskImages.map(img => img.file),
        existingImages,
      });
      
      cleanup();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: editingTask ? "Failed to update task" : "Failed to add task",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cleanup = () => {
    taskImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  };

  const resetForm = () => {
    cleanup();
    setTaskImages([]);
    setTitle("");
    setSite("");
    setDescription("");
    setNotes("");
    setStatus("in-progress");
    setTimeSlots([]);
    setShowPreview(false);
    setExistingImages([]);
  };

  const validateTimeSlots = () => {
    if (timeSlots.length === 0) {
      return { isValid: false, error: "Time slot is required" };
    }

    for (const slot of timeSlots) {
      if (!slot.startTime) {
        return { isValid: false, error: "Start time is required" };
      }

      if (slot.endTime) {
        const start = slot.startTime;
        const end = slot.endTime;

        if (end <= start) {
          return { isValid: false, error: "End time must be after start time" };
        }
      }
    }

    return { isValid: true, error: null };
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'title':
        setTitle(value);
        break;
      case 'site':
        setSite(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'notes':
        setNotes(value);
        break;
      case 'status':
        setStatus(value as 'in-progress' | 'completed');
        break;
    }
  };

  const renderForm = () => {
    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-6 pr-4">
          {isDisabled && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-yellow-700">
                This task is completed and cannot be modified
              </p>
            </div>
          )}

          {isEditing && !isAdmin && !isDisabled && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-blue-700">
                You can only modify time slots and add notes to this task
              </p>
            </div>
          )}

          <TaskBasicForm
            title={title}
            site={site}
            description={description}
            notes={notes}
            status={status}
            isAdmin={isAdmin}
            isDisabled={isBasicFieldsDisabled}
            onFieldChange={handleFieldChange}
          />

          <Separator />

          <TaskTimeSlots
            timeSlots={timeSlots}
            isAdmin={isAdmin}
            isDisabled={isDisabled}
            onTimeSlotsChange={setTimeSlots}
          />

          <Separator />

          <TaskImageUpload
            taskImages={taskImages}
            existingImages={existingImages}
            isDisabled={isDisabled}
            onImagesChange={setTaskImages}
            onExistingImagesChange={setExistingImages}
          />
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
            <h3 className="text-lg font-semibold">Task Details</h3>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <p><strong>Title:</strong> {title}</p>
              <p><strong>Site:</strong> {site}</p>
              <p><strong>Description:</strong> {description || 'None'}</p>
              <p><strong>Notes:</strong> {notes || 'None'}</p>
              <Badge variant="secondary">
                Status: {status.replace('-', ' ')}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Time Slots</h3>
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div key={index} className="bg-secondary/50 p-4 rounded-lg">
                  <p><strong>Time:</strong> {slot.startTime} - {slot.endTime}</p>
                </div>
              ))}
            </div>
          </div>

          {(existingImages.length > 0 || taskImages.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Images</h3>
              <ImagePreview
                existingImages={existingImages}
                newImages={taskImages}
                readonly
              />
            </div>
          )}
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
              disabled={isUploading}
            >
              {isUploading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingTask ? 'Update' : 'Save'}
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
          <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="h-full">
              {renderForm()}
              
              <div className="sticky bottom-0 pt-4 bg-background">
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!title.trim()}
                  className="w-full"
                >
                  Review & {editingTask ? 'Update' : 'Save'}
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