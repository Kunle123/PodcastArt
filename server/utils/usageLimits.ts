import { TRPCError } from '@trpc/server';
import type { User } from '../../drizzle/schema';

export const USAGE_LIMITS = {
  free: {
    maxEpisodes: 10,
  },
  pro: {
    maxEpisodes: Infinity,
  },
  lifetime: {
    maxEpisodes: Infinity,
  },
};

export async function checkEpisodeLimit(user: User, projectId: string) {
  const plan = user.subscriptionPlan || 'free';
  const limit = USAGE_LIMITS[plan].maxEpisodes;

  if (limit === Infinity) {
    return true;
  }

  const { getProjectEpisodes } = await import('../db');
  const episodes = await getProjectEpisodes(projectId);
  
  if (episodes.length >= limit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Free plan is limited to ${limit} episodes. Upgrade to Pro for unlimited episodes.`,
    });
  }

  return true;
}

export function getEpisodeLimit(user: User): number {
  const plan = user.subscriptionPlan || 'free';
  return USAGE_LIMITS[plan].maxEpisodes;
}

