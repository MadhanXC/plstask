"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, Camera, X, Check, ArrowLeft, Plus, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskImage, Task, TimeSlot } from "@/types/task";
import { CameraCapture } from "../products/CameraCapture";
import { ImagePreview } from "../products/ImagePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  editingTask: Task | null;
}

const STATUS_OPTIONS = ['in-progress', 'completed'] as const;

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(dateString: string) {
  // Add time component to ensure consistent timezone handling
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function parseTime(time12: string): string {
  if (!time12) return '';
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let hours = endHour - startHour;
  let minutes = endMinute - startMinute;
  
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  
  if (hours < 0) {
    hours += 24;
  }
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }
}

function getAvailableEndTimes(startTime: string): string[] {
  if (!startTime) return [];
  
  const [startHour, startMinute] = parseTime(startTime).split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  
  const times: string[] = [];
  const startFrom = startMinutes + 30;
  const endAt = 24 * 60;
  
  for (let i = startFrom; i < endAt; i += 30) {
    const hour = Math.floor(i / 60);
    const minute = i % 60;
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    times.push(formatTime(time));
  }
  
  return times;
}

export function TaskDialog({ isOpen, onOpenChange, onSave, editingTask }: TaskDialogProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  
  const [showPreview, setShowPreview] = useState(false);
  const [imageSource, setImageSource] = useState<string>("");
  const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>("in-progress");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Determine if fields should be disabled
  const isCompleted = editingTask?.status === 'completed';
  const isEditing = !!editingTask;
  const isDisabled = isCompleted && !isAdmin;
  const isBasicFieldsDisabled = (isEditing && !isAdmin) || isDisabled;

  const availableStatuses = useMemo(() => {
    if (isAdmin) {
      return STATUS_OPTIONS;
    }
    return ['in-progress'] as const;
  }, [isAdmin]);

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

      setTaskImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setTaskImages(prev => {
        const newImages = [...prev];
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        return newImages;
      });
    }
  };

  const addTimeSlot = () => {
    // Get today's date in local timezone
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                String(now.getDate()).padStart(2, '0');
    
    // Check if a time slot already exists for this date
    const hasDateSlot = timeSlots.some(slot => slot.date === today);
    
    if (hasDateSlot) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "A time slot already exists for this date",
      });
      return;
    }
                
    // Add new time slot while preserving existing ones
    setTimeSlots(prev => [...prev, { date: today, startTime: "", endTime: "" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setTimeSlots(prev => {
      const updated = [...prev];
      
      if (field === 'startTime') {
        const newStartTime = parseTime(value);
        updated[index] = {
          ...updated[index],
          startTime: newStartTime,
          endTime: ''
        };
      } else if (field === 'endTime') {
        updated[index] = {
          ...updated[index],
          endTime: parseTime(value)
        };
      }
      
      return updated;
    });
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
        const start = parseTime(formatTime(slot.startTime));
        const end = parseTime(formatTime(slot.endTime));

        if (end <= start) {
          return { isValid: false, error: "End time must be after start time" };
        }
      }
    }

    return { isValid: true, error: null };
  };

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
    setImageSource("");
    setShowPreview(false);
    setExistingImages([]);
    setIsCameraActive(false);
  };

  const renderTimeSlots = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Time Slots</h3>
        <Button
          onClick={addTimeSlot}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Time Slot
        </Button>
      </div>

      {timeSlots.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No time slots added yet</p>
          <p className="text-sm">Click "Add Time Slot" to schedule the task</p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeSlots.map((slot, index) => {
            const isApproved = slot.approved;
            const canEditTime = isAdmin || !isApproved;
            
            return (
              <div key={index} className="bg-secondary/50 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-grow">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatDate(slot.date)}
                      </Badge>
                      {slot.startTime && slot.endTime && (
                        <Badge variant="outline" className="bg-primary/10">
                          Duration: {calculateDuration(slot.startTime, slot.endTime)}
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Start Time <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={slot.startTime ? formatTime(slot.startTime) : ""}
                          onValueChange={(value) => updateTimeSlot(index, 'startTime', value)}
                          disabled={!canEditTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 * 2 }).map((_, i) => {
                              const hour = Math.floor(i / 2);
                              const minute = (i % 2) * 30;
                              const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              return (
                                <SelectItem key={i} value={formatTime(time)}>
                                  {formatTime(time)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Time</label>
                        <Select
                          value={slot.endTime ? formatTime(slot.endTime) : ""}
                          onValueChange={(value) => updateTimeSlot(index, 'endTime', value)}
                          disabled={!slot.startTime || !canEditTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableEndTimes(formatTime(slot.startTime)).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {isAdmin && slot.endTime && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id={`approve-slot-${index}`}
                          checked={slot.approved}
                          onCheckedChange={(checked) => {
                            setTimeSlots(prev => {
                              const updated = [...prev];
                              updated[index] = {
                                ...updated[index],
                                approved: checked as boolean
                              };
                              return updated;
                            });
                          }}
                        />
                        <label
                          htmlFor={`approve-slot-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Approve time slot
                        </label>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeSlot(index)}
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 -mt-1"
                    disabled={!canEditTime}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

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

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Site</label>
              <Input
                placeholder="Enter site location"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Enter task description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-y"
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add any additional notes or comments"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] resize-y"
                disabled={isDisabled}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={status}
                  onValueChange={(value: typeof STATUS_OPTIONS[number]) => setStatus(value)}
                  disabled={isDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {renderTimeSlots()}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Images</h3>
            
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
                    setTaskImages(prev => [...prev, {
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
              newImages={taskImages}
              onRemove={removeImage}
              disabled={isDisabled}
              maxImages={50}
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
                  <p><strong>Time:</strong> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
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