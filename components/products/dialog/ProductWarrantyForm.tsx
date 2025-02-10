"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WarrantyDetails } from "@/types/product";

interface ProductWarrantyFormProps {
  warranty: WarrantyDetails;
  isDisabled: boolean;
  onWarrantyChange: (warranty: WarrantyDetails) => void;
}

const COVERAGE_OPTIONS = [
  'Parts',
  'Labor',
  'Accidental Damage',
  'Technical Support',
  'Replacement',
  'Repair',
];

export function ProductWarrantyForm({
  warranty,
  isDisabled,
  onWarrantyChange,
}: ProductWarrantyFormProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Warranty Information</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Warranty Type</label>
          <Select
            value={warranty.type}
            onValueChange={(value: 'basic' | 'extended' | 'lifetime') => 
              onWarrantyChange({ ...warranty, type: value })
            }
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select warranty type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Warranty</SelectItem>
              <SelectItem value="extended">Extended Warranty</SelectItem>
              <SelectItem value="lifetime">Lifetime Warranty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (months)</label>
          <Input
            type="number"
            min="0"
            value={warranty.duration}
            onChange={(e) => onWarrantyChange({
              ...warranty,
              duration: parseInt(e.target.value) || 0
            })}
            disabled={isDisabled}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Provider</label>
          <Input
            placeholder="Enter warranty provider"
            value={warranty.provider}
            onChange={(e) => onWarrantyChange({
              ...warranty,
              provider: e.target.value
            })}
            disabled={isDisabled}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Coverage</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COVERAGE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex items-center space-x-2 text-sm bg-secondary/50 p-2 rounded-md hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={warranty.coverage.includes(option)}
                  onChange={(e) => {
                    const newCoverage = e.target.checked
                      ? [...warranty.coverage, option]
                      : warranty.coverage.filter(item => item !== option);
                    onWarrantyChange({
                      ...warranty,
                      coverage: newCoverage
                    });
                  }}
                  className="rounded border-gray-300"
                  disabled={isDisabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Terms and Conditions</label>
          <Textarea
            placeholder="Enter warranty terms and conditions"
            value={warranty.terms}
            onChange={(e) => onWarrantyChange({
              ...warranty,
              terms: e.target.value
            })}
            className="min-h-[100px] resize-y"
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
}