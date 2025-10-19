import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const syncRouter = router({
  syncProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { getProject } = await import('../db');
      const { syncAllProjects } = await import('../jobs/rssSync');
      
      const project = await getProject(input.projectId);
      
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (!project.rssFeedUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project does not have an RSS feed',
        });
      }

      // Trigger sync for this specific project
      // For now, we'll sync all projects (can optimize later)
      await syncAllProjects();

      return { success: true, message: 'Sync completed' };
    }),

  toggleAutoSync: protectedProcedure
    .input(z.object({ 
      projectId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getProject, getDb } = await import('../db');
      const { projects } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const project = await getProject(input.projectId);
      
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      await db
        .update(projects)
        .set({ autoSync: input.enabled ? 'enabled' : 'disabled' })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),
});

