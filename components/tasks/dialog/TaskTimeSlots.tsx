"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2 } from "lucide-react";
import { TimeSlot } from "@/types/task";
import { useToast } from "@/hooks/use-toast";

interface TaskTimeSlotsProps {
  timeSlots: TimeSlot[];
  isAdmin: boolean;
  isDisabled: boolean;
  onTimeSlotsChange: (timeSlots: TimeSlot[]) => void;
}

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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

function formatDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function TaskTimeSlots({
  timeSlots,
  isAdmin,
  isDisabled,
  onTimeSlotsChange,
}: TaskTimeSlotsProps) {
  const { toast } = useToast();

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
                
    onTimeSlotsChange([...timeSlots, { date: today, startTime: "", endTime: "" }]);
  };

  const removeTimeSlot = (index: number) => {
    onTimeSlotsChange(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime' | 'approved', value: string | boolean) => {
    const updated = [...timeSlots];
    
    if (field === 'startTime') {
      const newStartTime = parseTime(value as string);
      updated[index] = {
        ...updated[index],
        startTime: newStartTime,
        endTime: ''
      };
    } else if (field === 'endTime') {
      updated[index] = {
        ...updated[index],
        endTime: parseTime(value as string)
      };
    } else if (field === 'approved') {
      updated[index] = {
        ...updated[index],
        approved: value as boolean
      };
    }
    
    onTimeSlotsChange(updated);
  };

  return (
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
                          id={`approve-slot -${index}`}
                          checked={slot.approved}
                          onCheckedChange={(checked) => {
                            updateTimeSlot(index, 'approved', checked as boolean);
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
}