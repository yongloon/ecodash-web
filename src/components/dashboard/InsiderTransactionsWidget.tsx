// File: src/components/dashboard/InsiderTransactionsWidget.tsx
// (Adding dataTimestamp prop)
"use client";

import React from 'react';
import { InsiderTransaction } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersRound, DollarSign, ArrowRightLeft, Info } from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNowStrict } from 'date-fns'; // Added formatDistanceToNowStrict
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InsiderTransactionsWidgetProps {
    initialTransactions?: InsiderTransaction[];
    itemCount?: number;
    title?: string;
    dataTimestamp?: string; // For "Last Updated" display
}

const formatTransactionType = (code: string, type: string): string => {
    if (code === 'P' || type.toLowerCase().includes('purchase')) return "Purchase";
    if (code === 'S' || type.toLowerCase().includes('sale')) return "Sale";
    return type;
};

const getTransactionColor = (code: string): string => {
    if (code === 'P') return "text-green-500 dark:text-green-400";
    if (code === 'S') return "text-red-500 dark:text-red-400";
    return "text-muted-foreground";
};

export default function InsiderTransactionsWidget({
    initialTransactions = [],
    itemCount = 5,
    title = "Recent Insider Trades",
    dataTimestamp
}: InsiderTransactionsWidgetProps) {
    const transactionsToDisplay = initialTransactions.slice(0, itemCount);

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                    <ArrowRightLeft className="h-5 w-5 mr-2 text-teal-500" />
                    {title}
                </CardTitle>
                 {transactionsToDisplay.length === 0 && (
                     <TooltipProvider delayDuration={100}><Tooltip>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs"><p>No recent insider transactions found or data is unavailable for the default ticker (AAPL).</p></TooltipContent>
                     </Tooltip></TooltipProvider>
                )}
            </CardHeader>
            <CardContent>
                {transactionsToDisplay.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent insider transactions to display for {title.includes("AAPL") ? "AAPL" : "the selected ticker"}.</p>
                )}
                {transactionsToDisplay.length > 0 && (
                    <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {transactionsToDisplay.map((tx, index) => (
                            <li key={`${tx.symbol}-${tx.filingDate}-${tx.transactionDate}-${index}`} className="border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-sm text-foreground">{tx.symbol}</span>
                                    <span className={`font-medium ${getTransactionColor(tx.transactionCode)}`}>
                                        {formatTransactionType(tx.transactionCode, tx.transactionType)}
                                    </span>
                                </div>
                                <div className="text-muted-foreground mb-0.5">
                                    <span title={tx.reportingName}>{tx.reportingName.length > 25 ? tx.reportingName.substring(0,22) + "..." : tx.reportingName}</span>
                                    {tx.reportingTitle && tx.reportingTitle !== "N/A" && ` (${tx.reportingTitle.substring(0,20)})`}
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground/80">
                                    <span>Shares: {parseFloat(tx.shares).toLocaleString()}</span>
                                    {tx.pricePerShare && parseFloat(tx.pricePerShare) > 0 && <span>@ ${parseFloat(tx.pricePerShare).toFixed(2)}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground/70 mt-0.5">
                                    Transaction: {isValid(parseISO(tx.transactionDate)) ? format(parseISO(tx.transactionDate), 'MMM d, yyyy') : tx.transactionDate}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
                    <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                        Insider data as of {formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true })}
                    </p>
                )}
                <div className="mt-1 text-center">
                    <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                        Insider transaction data by Alpha Vantage
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}