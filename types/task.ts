"use client";

export interface TaskImage {
  file: File;
  preview: string;
}

export interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  approved?: boolean; // New field for admin approval
}

export interface Task {
  id: string;
  title: string;
  site: string;
  description: string;
  notes?: string; // Added notes field
  status: 'in-progress' | 'completed';
  timeSlots: TimeSlot[];
  images: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  uploaderEmail?: string;
}