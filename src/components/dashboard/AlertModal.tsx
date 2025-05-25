// src/components/dashboard/AlertModal.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndicatorMetadata } from '@/lib/indicators';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: IndicatorMetadata;
  currentValue: number | null;
  onAlertCreated: () => void; // Callback to refresh alerts list
}

export default function AlertModal({ isOpen, onOpenChange, indicator, currentValue, onAlertCreated }: AlertModalProps) {
  const [targetValue, setTargetValue] = useState<string>(currentValue?.toString() || '');
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    toast.dismiss();

    const numericTarget = parseFloat(targetValue);
    if (isNaN(numericTarget)) {
      toast.error("Target value must be a valid number.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorId: indicator.id,
          targetValue: numericTarget,
          condition,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create alert.");
      } else {
        toast.success("Alert created successfully!");
        onAlertCreated(); // Call the callback
        onOpenChange(false); // Close modal
      }
    } catch (error) {
      toast.error("An unexpected error occurred creating the alert.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Alert for: {indicator.name}</DialogTitle>
          <DialogDescription>
            Get notified when {indicator.name} goes above or below your target value.
            Current value: {currentValue?.toLocaleString() ?? 'N/A'} {indicator.unit}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condition" className="text-right col-span-1">
              Notify when
            </Label>
            <Select value={condition} onValueChange={(value: "ABOVE" | "BELOW") => setCondition(value)} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABOVE">Goes Above</SelectItem>
                <SelectItem value="BELOW">Falls Below</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetValue" className="text-right col-span-1">
              Target Value
            </Label>
            <Input
              id="targetValue"
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="col-span-3"
              required
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Saving..." : "Set Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}