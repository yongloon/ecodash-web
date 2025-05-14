// src/components/dashboard/NewsFeedWidget.tsx
"use client"; // This component will fetch and display data

import React, { useEffect, useState } from 'react';
import { NewsArticle, fetchNewsHeadlines } from '@/lib/api'; // Assuming fetchNewsHeadlines is in api.ts
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';

interface NewsFeedWidgetProps {
  initialNews?: NewsArticle[]; // For SSR/SSG if implemented later
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
    setIsLoading(true);
    setError(null);
    console.log("[NewsFeedWidget] Fetching news..."); // Add log
    fetchNewsHeadlines(defaultCategory, defaultCountry, itemCount)
      .then(data => {
        console.log("[NewsFeedWidget] Fetched news articles:", data.length); // Add log
        setArticles(data);
      })
      .catch(err => {
          console.error("[NewsFeedWidget] Failed to load news:", err, err.info); // Log detailed error
          setError(err.message || "Could not load news at this time.");
      })
      .finally(() => setIsLoading(false));
  }
}, [initialNews, defaultCategory, defaultCountry, itemCount]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Newspaper className="h-5 w-5 mr-2 text-indigo-500" />
          Latest Headlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!isLoading && !error && articles.length === 0 && (
          <p className="text-sm text-muted-foreground">No news articles found.</p>
        )}
        {!isLoading && !error && articles.length > 0 && (
          <ul className="space-y-3">
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
        {!isLoading && !error && (
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