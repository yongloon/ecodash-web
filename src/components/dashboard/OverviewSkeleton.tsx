// src/components/dashboard/OverviewSkeleton.tsx
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SkeletonCard from '@/components/ui/SkeletonCard'; // Assuming you have this or a similar generic skeleton

const OverviewSkeleton = () => {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      <div className="h-10 bg-muted rounded w-1/3"></div> {/* Title Skeleton */}

      {/* Upgrade Banner Skeleton (Optional, if it's always there for some users) */}
      {/* <Card className="bg-muted/30 h-24 mb-6"></Card> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Favorites Section Skeleton */}
          <section>
            <div className="h-6 bg-muted rounded w-1/4 mb-3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <SkeletonCard key={`fav-skel-${i}`} />)}
            </div>
          </section>

          {/* Key Indicators Section Skeleton */}
          <section>
            <div className="h-6 bg-muted rounded w-1/3 mb-3 mt-6"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={`key-skel-${i}`} />)}
            </div>
          </section>

          {/* Asset Risk Insights Skeleton */}
          <section>
             <div className="h-6 bg-muted rounded w-2/5 mb-4 mt-6 md:mt-8"></div>
             <div className="space-y-6">
                {[1,2,3].map(i => (
                    <Card key={`risk-skel-${i}`} className="h-40"><CardHeader className="h-10 bg-muted/50 rounded-t-lg"></CardHeader><CardContent className="p-4 space-y-2"> <div className="h-3 bg-muted rounded w-full"></div> <div className="h-3 bg-muted rounded w-3/4"></div> <div className="h-3 bg-muted rounded w-full"></div></CardContent></Card>
                ))}
             </div>
          </section>
        </div>

        {/* Sidebar Widgets Skeleton */}
        <aside className="lg:col-span-1 space-y-6 md:space-y-8">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={`widget-skel-${i}`} className="h-60">
               <CardHeader className="h-10 bg-muted/50 rounded-t-lg"></CardHeader>
               <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
               </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default OverviewSkeleton;