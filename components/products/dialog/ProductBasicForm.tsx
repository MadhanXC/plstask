"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductBasicFormProps {
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  status: 'approved' | 'unapproved';
  isAdmin: boolean;
  isDisabled: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function ProductBasicForm({
  name,
  description,
  serialNumber,
  purchaseDate,
  status,
  isAdmin,
  isDisabled,
  onFieldChange,
}: ProductBasicFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Product Name</label>
          <Input
            placeholder="Enter product name"
            value={name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Enter product description"
            value={description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            className="min-h-[100px] resize-y"
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Serial Number</label>
          <Input
            placeholder="Enter serial number"
            value={serialNumber}
            onChange={(e) => onFieldChange('serialNumber', e.target.value)}
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Purchase Date</label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => onFieldChange('purchaseDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            disabled={isDisabled}
          />
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={status}
              onValueChange={(value: 'approved' | 'unapproved') => onFieldChange('status', value)}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="unapproved">Unapproved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}