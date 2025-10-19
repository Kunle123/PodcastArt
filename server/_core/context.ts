import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getClerkUser } from "../clerkAuth";
import { getDb, upsertUser } from "../db";

export type Context = CreateExpressContextOptions;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get user from Clerk session
    const clerkUser = await getClerkUser(opts);
    
    if (clerkUser) {
      // Upsert user in database
      await upsertUser({
        id: clerkUser.id,
        email: clerkUser.email,
        name: clerkUser.name,
        loginMethod: 'clerk',
        lastSignedIn: new Date(),
      });

      // Get full user from database
      const db = await getDb();
      if (db) {
        const [dbUser] = await db
          .select()
          .from(await import('../../drizzle/schema').then(m => m.users))
          .where((await import('drizzle-orm').then(m => m.eq))(
            (await import('../../drizzle/schema').then(m => m.users)).id,
            clerkUser.id
          ))
          .limit(1);
        user = dbUser || null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Auth] Error in createContext:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

