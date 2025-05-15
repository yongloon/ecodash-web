// src/components/dashboard/NewsFeedWidget.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { NewsArticle, fetchNewsHeadlines } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Loader2, AlertTriangle, Info } from 'lucide-react'; // Added Info
import { formatDistanceToNowStrict } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For info icon

interface NewsFeedWidgetProps {
  initialNews?: NewsArticle[];
  defaultCategory?: string;
  defaultCountry?: string;
  itemCount?: number;
}

export default function NewsFeedWidget({
    initialNews,
    defaultCategory = 'business',
    defaultCountry = 'us',
    itemCount = 5
}: NewsFeedWidgetProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialNews || []);
  const [isLoading, setIsLoading] = useState(!initialNews);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialNews) {
      // console.log(`[NewsFeedWidget] useEffect: Fetching news. Cat: ${defaultCategory}, Country: ${defaultCountry}, Count: ${itemCount}`);
      setIsLoading(true);
      setError(null);
      fetchNewsHeadlines(defaultCategory, defaultCountry, itemCount)
        .then(data => {
          // console.log(`[NewsFeedWidget] fetchNewsHeadlines returned ${data.length} articles. Data:`, JSON.stringify(data, null, 2).substring(0, 300));
          setArticles(data);
        })
        .catch(err => {
            console.error("[NewsFeedWidget] Error fetching news:", err);
            setError(err.message || "Could not load news headlines.");
        })
        .finally(() => {
            // console.log("[NewsFeedWidget] Fetch finished.");
            setIsLoading(false);
        });
    } else {
        // console.log("[NewsFeedWidget] Using initialNews. Count:", initialNews.length);
        setArticles(initialNews);
        setIsLoading(false);
    }
  }, [initialNews, defaultCategory, defaultCountry, itemCount]);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Newspaper className="h-5 w-5 mr-2 text-indigo-500" />
          Latest Headlines
        </CardTitle>
        {!isLoading && !error && articles.length === 0 && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>No articles found. This could be due to API limitations on the free tier or no recent news matching the criteria.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-sm text-muted-foreground">Loading news...</p>
          </div>
        )}
        {!isLoading && error && (
            <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                <span>{error}</span>
            </div>
        )}
        {!isLoading && !error && articles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No news articles currently available for {defaultCategory} in {defaultCountry.toUpperCase()}.
          </p>
        )}
        {!isLoading && !error && articles.length > 0 && (
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {articles.map((article, index) => (
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
                    {article.publishedAt && (
                        <span>{formatDistanceToNowStrict(new Date(article.publishedAt), { addSuffix: true })}</span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
         {!isLoading && (
             <div className="mt-4 text-center">
                <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                    News powered by NewsAPI.org
                </a>
            </div>
        )}
      </CardContent>
    </Card>
  );
}