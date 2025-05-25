// src/components/WhatsNewModal.tsx
"use client";

import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming you have this from Shadcn/ui

interface WhatsNewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Manually update this content
const changelogItems = [
  {
    version: "v0.2.0 - July 28, 2024",
    changes: [
      "✨ Added Indicator Comparison Tool (Pro Feature)!",
      "📊 Enhanced Chart Component: Supports multiple series, dual Y-axis, and zoom/pan via Brush.",
      "🔔 Introduced User Alerts: Set target value notifications for indicators (Basic/Pro Feature).",
      "📄 Added 'Manage Alerts' page in user account.",
      "ℹ️ Indicator cards now feature an Info modal for detailed descriptions.",
      "🐛 Various UI improvements and bug fixes.",
    ]
  },
  {
    version: "v0.1.0 - July 27, 2024",
    changes: [
      "🚀 EcoDash Beta Launch!",
      "📈 View key economic indicators with charts.",
      "⭐ Favorite indicators for quick access.",
      "ರು User accounts and basic subscription tiers.",
    ]
  },
  // Add more entries here as you release updates, newest first
];

export default function WhatsNewModal({ isOpen, onOpenChange }: WhatsNewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>What's New in EcoDash</DialogTitle>
          <DialogDescription>
            Stay updated with the latest features and improvements.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4"> {/* Added pr-4 for scrollbar spacing */}
          <div className="space-y-6 py-4">
            {changelogItems.map((item) => (
              <div key={item.version}>
                <h3 className="text-md font-semibold text-foreground mb-1.5">{item.version}</h3>
                <ul className="list-disc list-inside space-y-1 pl-4 text-sm text-muted-foreground">
                  {item.changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}