// src/lib/permissions.ts
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';

export const FEATURE_KEYS = {
  MOVING_AVERAGES: 'MOVING_AVERAGES',
  ADVANCED_STATS_BUTTON: 'ADVANCED_STATS_BUTTON',
  FAVORITES: 'FAVORITES',
  INDICATOR_COMPARISON: 'INDICATOR_COMPARISON',
  // Add more feature keys as needed
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

const FEATURE_ACCESS_CONFIG: Record<FeatureKey, AppPlanTier[]> = {
  [FEATURE_KEYS.MOVING_AVERAGES]: ['basic', 'pro'],
  [FEATURE_KEYS.ADVANCED_STATS_BUTTON]: ['pro'],
  [FEATURE_KEYS.FAVORITES]: ['basic', 'pro'],
  [FEATURE_KEYS.INDICATOR_COMPARISON]: ['pro'],
};

export const canUserAccessFeature = (
  userTier: AppPlanTier | undefined,
  featureKey: FeatureKey
): boolean => {
  const effectiveTier = userTier || 'free'; // Default to 'free' if undefined
  const accessList = FEATURE_ACCESS_CONFIG[featureKey];
  if (!accessList) {
    console.warn(`[Permissions] Feature key "${featureKey}" not found in FEATURE_ACCESS_CONFIG.`);
    return false; // Or true, depending on default access for unknown features
  }
  return accessList.includes(effectiveTier);
};