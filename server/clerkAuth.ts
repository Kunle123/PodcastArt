// Clerk authentication middleware for tRPC
import { verifyToken } from '@clerk/backend';
import type { Context } from './_core/context';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

export interface ClerkUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Get user from Clerk session token
 */
export async function getUserFromClerkToken(token: string): Promise<ClerkUser | null> {
  if (!CLERK_SECRET_KEY) {
    console.warn('[Clerk] CLERK_SECRET_KEY not configured');
    return null;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
      return null;
    }

    // Extract user info from Clerk token
    const userId = payload.sub;
    const email = (payload.email as string) || '';
    const firstName = (payload.first_name as string) || '';
    const lastName = (payload.last_name as string) || '';
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0];

    return {
      id: userId,
      email,
      name,
    };
  } catch (error) {
    console.error('[Clerk] Token verification failed:', error);
    return null;
  }
}

/**
 * Middleware to extract user from Clerk session
 */
export async function getClerkUser(ctx: Context): Promise<ClerkUser | null> {
  // Try to get token from Authorization header
  const authHeader = ctx.req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return getUserFromClerkToken(token);
  }

  // Try to get token from cookie
  const sessionToken = ctx.req.cookies?.__session;
  if (sessionToken) {
    return getUserFromClerkToken(sessionToken);
  }

  return null;
}

