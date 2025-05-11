// src/components/ui/SkeletonCard.tsx
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

const SkeletonCard = () => {
  return (
    <Card className="flex flex-col h-full animate-pulse">
      <CardHeader>
        <div className="h-5 bg-muted rounded w-3/4 mb-2"></div> {/* Skeleton for Title */}
        <div className="h-4 bg-muted rounded w-1/2"></div>    {/* Skeleton for Description/Value */}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow h-48 md:h-64 bg-muted rounded"></div> {/* Skeleton for Chart Area */}
      </CardContent>
      <CardFooter> {/* Mimic CardFooter structure */}
        <div className="h-3 bg-muted rounded w-1/3"></div> {/* Skeleton for Footer content */}
      </CardFooter>
    </Card>
  );
};

export default SkeletonCard;