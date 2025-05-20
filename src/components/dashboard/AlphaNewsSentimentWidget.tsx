// File: src/components/dashboard/AlphaNewsSentimentWidget.tsx
// (Adding dataTimestamp prop similar to NewsFeedWidget)
"use client";

import React from 'react';
import { NewsSentimentArticle } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewspaperIcon, MessageSquareText, TrendingUp, TrendingDown, MinusCircle, Info } from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNowStrict } from 'date-fns'; // Added isValid, formatDistanceToNowStrict
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlphaNewsSentimentWidgetProps {
    initialArticles?: NewsSentimentArticle[];
    itemCount?: number;
    title?: string;
    dataTimestamp?: string; // For "Last Updated" display
}

const getSentimentIconAndColor = (label: string): { icon: React.ElementType, color: string } => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("bullish")) return { icon: TrendingUp, color: "text-green-500 dark:text-green-400" };
    if (lowerLabel.includes("bearish")) return { icon: TrendingDown, color: "text-red-500 dark:text-red-400" };
    return { icon: MinusCircle, color: "text-gray-500 dark:text-gray-400" };
};

const formatPublishedTime = (timeStr: string): string => {
    try {
        const year = timeStr.substring(0, 4);
        const month = timeStr.substring(4, 6);
        const day = timeStr.substring(6, 8);
        const hour = timeStr.substring(9, 11);
        const minute = timeStr.substring(11, 13);
        const dateObj = parseISO(`${year}-${month}-${day}T${hour}:${minute}:00`);
        if (!isValid(dateObj)) return "Invalid Date";
        return format(dateObj, "MMM d, HH:mm");
    } catch {
        return "Invalid Date";
    }
};

export default function AlphaNewsSentimentWidget({
    initialArticles = [],
    itemCount = 3,
    title = "Market News & Sentiment",
    dataTimestamp
}: AlphaNewsSentimentWidgetProps) {
    const articlesToDisplay = initialArticles.slice(0, itemCount);

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                    <MessageSquareText className="h-5 w-5 mr-2 text-purple-500" />
                    {title}
                </CardTitle>
                {articlesToDisplay.length === 0 && (
                     <TooltipProvider delayDuration={100}><Tooltip>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs"><p>No news/sentiment data found. This could be due to API limitations or no recent relevant news.</p></TooltipContent>
                     </Tooltip></TooltipProvider>
                )}
            </CardHeader>
            <CardContent>
                {articlesToDisplay.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent news or sentiment data available.</p>
                )}
                {articlesToDisplay.length > 0 && (
                    <ul className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {articlesToDisplay.map((article, index) => {
                            const SentimentDisplay = getSentimentIconAndColor(article.overall_sentiment_label);
                            return (
                                <li key={article.url || index} className="border-b border-border/30 pb-3 last:border-b-0 last:pb-0">
                                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="group block">
                                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-1">
                                            {article.title}
                                        </h4>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                            <span className="truncate max-w-[60%]" title={article.source_domain}>{article.source_domain}</span>
                                            {article.time_published && <span>{formatPublishedTime(article.time_published)}</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2 mb-1.5" title={article.summary}>
                                            {article.summary}
                                        </p>
                                        <div className={`flex items-center text-xs font-medium ${SentimentDisplay.color}`}>
                                            <SentimentDisplay.icon className="h-3.5 w-3.5 mr-1" />
                                            {article.overall_sentiment_label} (Score: {article.overall_sentiment_score.toFixed(3)})
                                        </div>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
                    <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                        Sentiment data as of {formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true })}
                    </p>
                )}
                <div className="mt-1 text-center">
                    <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                        News & Sentiment by Alpha Vantage
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}