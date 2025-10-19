import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { generateUpdatedRSSFeed, generateArtworkURLList, getPlatformInstructions } from '../utils/rssFeedGenerator';

export const rssFeedRouter = router({
  /**
   * Generate updated RSS feed with new artwork URLs
   */
  generateUpdatedFeed: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getProject, getProjectEpisodes } = await import('../db');
      
      // Get project
      const project = await getProject(input.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      if (!project.rssFeedUrl) {
        throw new Error('Project does not have an RSS feed URL');
      }

      // Get episodes with generated artwork
      const episodes = await getProjectEpisodes(input.projectId);
      const episodesWithArtwork = episodes.filter(ep => ep.generatedArtworkUrl);

      if (episodesWithArtwork.length === 0) {
        throw new Error('No episodes with generated artwork found. Generate artwork first.');
      }

      // Generate updated RSS feed
      const updatedFeed = await generateUpdatedRSSFeed(project.rssFeedUrl, episodes);

      return updatedFeed;
    }),

  /**
   * Get artwork URL list for manual update
   */
  getArtworkURLList: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { getProject, getProjectEpisodes } = await import('../db');
      
      const project = await getProject(input.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const episodes = await getProjectEpisodes(input.projectId);
      const episodesWithArtwork = episodes.filter(ep => ep.generatedArtworkUrl);

      if (episodesWithArtwork.length === 0) {
        throw new Error('No episodes with generated artwork found');
      }

      const urlList = generateArtworkURLList(episodes);

      return {
        urlList,
        episodes: episodesWithArtwork.map(ep => ({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          artworkUrl: ep.generatedArtworkUrl,
        })),
      };
    }),

  /**
   * Get platform-specific instructions
   */
  getPlatformInstructions: protectedProcedure
    .input(z.object({
      platform: z.string(),
    }))
    .query(({ input }) => {
      return getPlatformInstructions(input.platform);
    }),
});

