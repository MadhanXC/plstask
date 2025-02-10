"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskBasicFormProps {
  title: string;
  site: string;
  description: string;
  notes: string;
  status: 'in-progress' | 'completed';
  isAdmin: boolean;
  isDisabled: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function TaskBasicForm({
  title,
  site,
  description,
  notes,
  status,
  isAdmin,
  isDisabled,
  onFieldChange,
}: TaskBasicFormProps) {
  const availableStatuses = isAdmin ? ['in-progress', 'completed'] as const : ['in-progress'] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="Enter task title"
          value={title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Site</label>
        <Input
          placeholder="Enter site location"
          value={site}
          onChange={(e) => onFieldChange('site', e.target.value)}
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          placeholder="Enter task description"
          value={description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          className="min-h-[100px] resize-y"
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          placeholder="Add any additional notes or comments"
          value={notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          className="min-h-[100px] resize-y"
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select
          value={status}
          onValueChange={(value: typeof availableStatuses[number]) => onFieldChange('status', value)}
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
  );
}