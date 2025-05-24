// src/lib/permissions.ts
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';

export const FEATURE_KEYS = {
  MOVING_AVERAGES: 'MOVING_AVERAGES',
  ADVANCED_STATS_BUTTON: 'ADVANCED_STATS_BUTTON',
  FAVORITES: 'FAVORITES',
  INDICATOR_COMPARISON: 'INDICATOR_COMPARISON',
  DATA_EXPORT: 'DATA_EXPORT', // Ensure this is present
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

const FEATURE_ACCESS_CONFIG: Record<FeatureKey, AppPlanTier[]> = {
  [FEATURE_KEYS.MOVING_AVERAGES]: ['basic', 'pro'],
  [FEATURE_KEYS.ADVANCED_STATS_BUTTON]: ['pro'],
  [FEATURE_KEYS.FAVORITES]: ['basic', 'pro'],
  [FEATURE_KEYS.INDICATOR_COMPARISON]: ['pro'],
  [FEATURE_KEYS.DATA_EXPORT]: ['pro'], // Set access tier, e.g., 'pro' only
};

export const canUserAccessFeature = (
  userTier: AppPlanTier | undefined,
  featureKey: FeatureKey
): boolean => {
  const effectiveTier = userTier || 'free';
  const accessList = FEATURE_ACCESS_CONFIG[featureKey];
  if (!accessList) {
    console.warn(`[Permissions] Feature key "${featureKey}" not found in FEATURE_ACCESS_CONFIG.`);
    return false;
  }
  return accessList.includes(effectiveTier);
};