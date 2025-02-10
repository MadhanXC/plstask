"use client";

import { Task } from "@/types/task";
import { UserData } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, User, Mail, Eye, Clock, Tag, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { ImagePreview } from "../products/ImagePreview";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";

interface TaskListProps {
  tasks: Task[];
  userData: UserData;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
}

interface UploaderInfo {
  name: string;
  email: string;
}

const statusColors = {
  "in-progress": "bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors",
  completed: "bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
};

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function calculateDuration(startTime: string, endTime: string): string {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (durationMinutes < 0) durationMinutes += 24 * 60;
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function TaskList({ tasks, userData, onEdit, onDelete }: TaskListProps) {
  const isAdmin = userData.role === 'admin';
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [uploaderInfo, setUploaderInfo] = useState<UploaderInfo | null>(null);

  useEffect(() => {
    const fetchUploaderInfo = async () => {
      if (isAdmin && selectedTask?.userId && selectedTask.userId !== userData.uid) {
        try {
          const userDocRef = doc(db, "users", selectedTask.userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUploaderInfo({
              name: userData.name || 'Unknown User',
              email: userData.email || selectedTask.uploaderEmail || 'No email'
            });
          }
        } catch (error) {
          console.error("Error fetching uploader info:", error);
          setUploaderInfo({
            name: 'Unknown User',
            email: selectedTask.uploaderEmail || 'No email'
          });
        }
      }
    };

    if (selectedTask) {
      fetchUploaderInfo();
    }
  }, [selectedTask, isAdmin, userData.uid]);

  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        {tasks.map((task) => {
          const isOwner = task.userId === userData.uid;
          const isCompleted = task.status === 'completed';
          const hasApprovedSlots = task.timeSlots.some(slot => slot.approved);
          const canDelete = isAdmin || (isOwner && !hasApprovedSlots);
          const canModify = isAdmin || (isOwner && !isCompleted);
          
          // Get the latest time slot
          const timeSlot = task.timeSlots.length > 0
            ? [...task.timeSlots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;
          
          return (
            <div key={task.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-base truncate">{task.title}</h3>
                        <Badge className={statusColors[task.status]}>
                          {task.status.replace('-', ' ')}
                        </Badge>
                        {isCompleted && !isAdmin && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Site: {task.site}</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {task.description}
                      </p>
                      
                      {timeSlot && (
                        <div className="mt-2 space-y-1">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {formatDate(timeSlot.date)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(timeSlot.startTime)}
                              {timeSlot.endTime && (
                                <> - {formatTime(timeSlot.endTime)}</>
                              )}
                            </Badge>
                            {timeSlot.endTime && (
                              <Badge variant="outline" className="bg-primary/10">
                                Duration: {calculateDuration(timeSlot.startTime, timeSlot.endTime)}
                              </Badge>
                            )}
                            {timeSlot.approved && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors">
                                Approved
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowDetails(true);
                        }}
                        className="hover:bg-primary/90 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      {canModify && (
                        <>
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => onEdit(task)}
                            className="hover:bg-primary/90 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Update
                          </Button>
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => handleDelete(task.id)}
                              className="text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{isOwner ? "Created by you" : uploaderInfo?.name || "Unknown User"}</span>
                    </div>
                    {!isOwner && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{task.uploaderEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {selectedTask.images.length > 0 && (
                <ImagePreview
                  existingImages={selectedTask.images}
                  newImages={[]}
                  readonly
                />
              )}

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusColors[selectedTask.status]}>
                    Status: {selectedTask.status.replace('-', ' ')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-700"><strong>Site:</strong> {selectedTask.site}</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                </div>

                {selectedTask.notes && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.notes}</p>
                    </div>
                  </div>
                )}

                {selectedTask.timeSlots.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Time Slots</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedTask.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>
                            {formatDate(slot.date)}: {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </span>
                          {slot.approved && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors">
                              Approved
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Administrative Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {uploaderInfo && (
                        <>
                          <p className="text-sm text-gray-600">
                            <strong>Created By:</strong> {uploaderInfo.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Email:</strong> {uploaderInfo.email}
                          </p>
                        </>
                      )}
                      <p className="text-sm text-gray-600">
                        <strong>Created:</strong> {new Date(selectedTask.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Last Updated:</strong> {new Date(selectedTask.updatedAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Task ID:</strong> {selectedTask.id}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemType="task"
      />
    </>
  );
}