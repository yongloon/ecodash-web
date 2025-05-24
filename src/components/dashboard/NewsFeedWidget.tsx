// src/components/dashboard/NewsFeedWidget.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { NewsArticle } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Info } from 'lucide-react';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NewsFeedWidgetProps {
  initialNews?: NewsArticle[];
  itemCount?: number;
  dataTimestamp?: string; // Added prop for overall widget data timestamp
}

const formatPublishedTimeClient = (publishedAt: string | null | undefined): string => {
  if (!publishedAt) return '';
  try {
    const date = parseISO(publishedAt);
    if (!isValid(date)) return 'Invalid date';
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (e) {
    // console.error("Error formatting date:", e); // Can be noisy
    return 'Invalid date';
  }
};

export default function NewsFeedWidget({
    initialNews = [],
    itemCount = 5,
    dataTimestamp 
}: NewsFeedWidgetProps) {
  const articlesToDisplay = initialNews.slice(0, itemCount);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Newspaper className="h-5 w-5 mr-2 text-indigo-500" />
          Latest Headlines
        </CardTitle>
        {articlesToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs"><p>No articles found. This could be due to API limitations or no recent news matching the criteria.</p></TooltipContent>
            </Tooltip></TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {articlesToDisplay.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No news articles currently available.
          </p>
        )}
        {articlesToDisplay.length > 0 && (
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {articlesToDisplay.map((article, index) => (
              <li key={article.url || index} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{article.source.name}</span>
                    {isClient && article.publishedAt ? (
                        <span>{formatPublishedTimeClient(article.publishedAt)}</span>
                    ) : (
                        <span> </span> 
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
        {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
            <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                News feed as of {isClient ? formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true }) : "a moment ago"}
            </p>
        )}
         <div className="mt-1 text-center">
            <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                News powered by NewsAPI.org
            </a>
        </div>
      </CardContent>
    </Card>
  );
}