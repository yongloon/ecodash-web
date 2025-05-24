// src/components/CommandPalette.tsx
"use client";

import React, { useState, useEffect, Fragment } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { indicatorCategories, indicators, IndicatorMetadata, IndicatorCategoryKey } from '@/lib/indicators';
import { useRouter } from 'next/navigation'; // <<< CORRECTED IMPORT
import { FileText, LayoutDashboard, Search, Settings, Star, Tag, DollarSign, MessageSquareIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, [setOpen]);

  const generalNavigation = [
    { name: 'Dashboard Overview', href: '/', icon: LayoutDashboard },
    { name: 'Pricing', href: '/pricing', icon: DollarSign },
    { name: 'Contact / Feedback', href: '/contact', icon: MessageSquareIcon },
    { name: 'My Account', href: '/account/profile', icon: Settings, auth: true },
    { name: 'My Favorites', href: '/favorites', icon: Star, auth: true, feature: FEATURE_KEYS.FAVORITES },
    { name: 'Indicator Comparison', href: '/pro/comparison', icon: FileText, auth: true, feature: FEATURE_KEYS.INDICATOR_COMPARISON },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-xl">
        <CommandPrimitive
          shouldFilter={true}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              placeholder="Search indicators or navigate..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandPrimitive.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <CommandPrimitive.Empty>No results found.</CommandPrimitive.Empty>

            <CommandPrimitive.Group heading="Navigation">
              {generalNavigation.map((item) => {
                if (item.auth && !session) return null;
                if (item.feature && !canUserAccessFeature(userTier, item.feature)) return null;
                return (
                  <CommandPrimitive.Item
                    key={item.href}
                    value={`nav-${item.name}`}
                    onSelect={() => runCommand(() => router.push(item.href))}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.Group>

            {Object.keys(indicatorCategories).map((key) => {
              const category = indicatorCategories[key as IndicatorCategoryKey];
              const CategoryIcon = category.icon;
              return (
                <CommandPrimitive.Group heading={category.name} key={category.slug}>
                  <CommandPrimitive.Item
                     value={`cat-nav-${category.slug}`}
                     onSelect={() => runCommand(() => router.push(`/category/${category.slug}`))}
                     className="cursor-pointer"
                  >
                    <CategoryIcon className="mr-2 h-4 w-4" />
                    <span>View All {category.name}</span>
                  </CommandPrimitive.Item>
                  {indicators
                    .filter((indicator) => indicator.categoryKey === key)
                    .map((indicator: IndicatorMetadata) => (
                      <CommandPrimitive.Item
                        key={indicator.id}
                        value={indicator.name}
                        onSelect={() => runCommand(() => router.push(`/category/${category.slug}?indicator=${indicator.id}`))}
                        className="cursor-pointer"
                      >
                        <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{indicator.name}</span>
                      </CommandPrimitive.Item>
                    ))}
                </CommandPrimitive.Group>
              );
            })}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}