// src/components/dashboard/AssetRiskCategoryCard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa'; // Keep these imports here

export interface KeyIndicatorDisplayInfo {
  id: string;
  name: string;
  unit: string;
  link: string;
  currentValueDisplay: string;
  trendIconName?: 'up' | 'down' | 'neutral'; // <<< CHANGED prop type
  trendColor?: string;
  explanation: string;
}

interface AssetRiskCategoryCardProps {
  title: string;
  description: string;
  indicatorsDisplayData: KeyIndicatorDisplayInfo[];
}

// Helper to get the icon component based on name
const getTrendIcon = (iconName?: 'up' | 'down' | 'neutral'): React.ElementType | null => {
  if (iconName === 'up') return FaArrowUp;
  if (iconName === 'down') return FaArrowDown;
  if (iconName === 'neutral') return FaMinus;
  return null;
};

export default function AssetRiskCategoryCard({ title, description, indicatorsDisplayData }: AssetRiskCategoryCardProps) {
  return (
    <Card className="flex flex-col h-full shadow-md">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-md font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-2 pb-4">
        {indicatorsDisplayData.length > 0 ? indicatorsDisplayData.map(item => {
          const TrendIconComponent = getTrendIcon(item.trendIconName); // <<< GET ICON COMPONENT HERE
          return (
            <div key={item.id} className="pb-2.5 border-b border-border/30 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-center mb-0.5">
                <Link href={item.link} className="text-sm font-medium text-primary hover:underline truncate pr-2" title={item.name}>
                  {item.name}
                </Link>
                <div className={`flex items-center text-sm font-semibold ${item.trendColor || 'text-foreground'}`}>
                  {/* Render the component if it exists */}
                  {TrendIconComponent && <TrendIconComponent className="h-3.5 w-3.5 mr-1 flex-shrink-0" />}
                  <span>{item.currentValueDisplay}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
            </div>
          );
        }) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Key indicator data for this category is currently unavailable.</p>
        )}
      </CardContent>
    </Card>
  );
}