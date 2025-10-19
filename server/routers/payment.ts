import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { createCheckoutSession, createPortalSession, constructWebhookEvent } from '../services/stripe';
import { TRPCError } from '@trpc/server';

export const paymentRouter = router({
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(['pro', 'lifetime']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      if (!user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email is required for checkout',
        });
      }

      // Get price ID from environment
      const priceId = input.plan === 'pro' 
        ? process.env.STRIPE_PRO_PRICE_ID 
        : process.env.STRIPE_LIFETIME_PRICE_ID;

      if (!priceId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Stripe price ID not configured',
        });
      }

      const session = await createCheckoutSession({
        userId: user.id,
        userEmail: user.email,
        priceId,
        successUrl: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
        cancelUrl: `${process.env.APP_URL || 'http://localhost:3000'}/pricing?payment=cancelled`,
      });

      return { url: session.url };
    }),

  createPortal: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { user } = ctx;
      const { getUser } = await import('../db');
      const dbUser = await getUser(user.id);

      if (!dbUser?.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Stripe customer found',
        });
      }

      const session = await createPortalSession({
        customerId: dbUser.stripeCustomerId,
        returnUrl: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
      });

      return { url: session.url };
    }),

  // Webhook handler (called by Stripe, not through tRPC)
  webhook: publicProcedure
    .input(z.object({
      body: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ input }) => {
      const event = await constructWebhookEvent(input.body, input.signature);
      const { updateUser } = await import('../db');

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId || session.client_reference_id;
          const customerId = session.customer as string;

          if (userId) {
            // Determine plan based on price ID
            const priceId = session.line_items?.data[0]?.price?.id;
            const plan = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'lifetime';

            await updateUser(userId, {
              stripeCustomerId: customerId,
              subscriptionPlan: plan,
              subscriptionStatus: 'active',
            });
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;

          // Find user by Stripe customer ID
          const { getDb } = await import('../db');
          const database = await getDb();
          if (!database) break;

          const { users } = await import('../../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const userResults = await database.select().from(users).where(eq(users.stripeCustomerId, customerId));
          const user = userResults[0];

          if (user) {
            const { updateUser } = await import('../db');
            await updateUser(user.id, {
              subscriptionStatus: subscription.status,
              subscriptionEndsAt: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000) 
                : null,
            });
          }
          break;
        }
      }

      return { received: true };
    }),
});

