"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, User, Mail, Eye, Clock, CheckCircle2, MapPin } from "lucide-react";
import { Task } from "@/types/task";
import { UserData } from "@/types/user";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePreview } from "../products/ImagePreview";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";

interface TaskCardProps {
  task: Task;
  userData: UserData;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

interface UploaderInfo {
  name: string;
  email: string;
}

const statusColors = {
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 transition-colors",
  completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors"
};

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function TaskCard({ task, userData, onEdit, onDelete }: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploaderInfo, setUploaderInfo] = useState<UploaderInfo | null>(null);
  const isAdmin = userData.role === 'admin';
  const isOwner = task.userId === userData.uid;
  const isCompleted = task.status === 'completed';
  const hasApprovedSlots = task.timeSlots.some(slot => slot.approved);
  const canDelete = isAdmin || (isOwner && !hasApprovedSlots);
  const canModify = isAdmin || (isOwner && !isCompleted);

  // Get the latest time slot by date
  const timeSlot = task.timeSlots.length > 0 
    ? [...task.timeSlots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  useEffect(() => {
    const fetchUploaderInfo = async () => {
      if (isAdmin && task.userId && !isOwner) {
        try {
          const userDocRef = doc(db, "users", task.userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUploaderInfo({
              name: userData.name || 'Unknown User',
              email: userData.email || task.uploaderEmail || 'No email'
            });
          }
        } catch (error) {
          console.error("Error fetching uploader info:", error);
          setUploaderInfo({
            name: 'Unknown User',
            email: task.uploaderEmail || 'No email'
          });
        }
      }
    };

    fetchUploaderInfo();
  }, [isAdmin, task.userId, task.uploaderEmail, isOwner]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <div 
        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 hover:border-gray-200"
        data-task-id={task.id}
      >
        {/* Image Section */}
        {task.images.length > 0 && (
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            <img
              src={task.images[0]}
              alt={task.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {task.images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                +{task.images.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="flex-grow p-4">
          <div className="space-y-3">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-base sm:text-lg line-clamp-1">{task.title}</h3>
                  <Badge className={statusColors[task.status]}>
                    {task.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>{task.site}</span>
                </div>
              </div>
              {isCompleted && !isAdmin && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>

            {/* Time Slot */}
            {timeSlot && (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-gray-50/50">
                    {formatDate(timeSlot.date)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 bg-gray-50/50">
                    <Clock className="h-3 w-3" />
                    {formatTime(timeSlot.startTime)}
                    {timeSlot.endTime && (
                      <> - {formatTime(timeSlot.endTime)}</>
                    )}
                  </Badge>
                  {timeSlot.endTime && (
                    <Badge variant="outline" className="bg-primary/5">
                      {calculateDuration(timeSlot.startTime, timeSlot.endTime)}
                    </Badge>
                  )}
                  {timeSlot.approved && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors">
                      Approved
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="space-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span>{isOwner ? "Created by you" : uploaderInfo?.name || "Unknown User"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="p-4 pt-0 border-t border-gray-100 mt-auto">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            {canModify && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {task.images.length > 0 && (
              <ImagePreview
                existingImages={task.images}
                newImages={[]}
                readonly
              />
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={statusColors[task.status]}>
                  Status: {task.status.replace('-', ' ')}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-lg">Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700"><strong>Site:</strong> {task.site}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              </div>

              {task.notes && (
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{task.notes}</p>
                  </div>
                </div>
              )}

              {task.timeSlots.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Time Slots</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {task.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>
                          {new Date(slot.date).toLocaleDateString()}: {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                        {slot.approved && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors">
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
                      <strong>Created:</strong> {new Date(task.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Last Updated:</strong> {new Date(task.updatedAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Task ID:</strong> {task.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(task.id);
          setShowDeleteConfirm(false);
        }}
        itemType="task"
      />
    </>
  );
}