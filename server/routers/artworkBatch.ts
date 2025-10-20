import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { generateBatchArtwork } from '../utils/artworkGenerator';
import { getProjectEpisodes, updateEpisode, getProjectTemplate } from '../db';

export const artworkBatchRouter = router({
  /**
   * Generate artwork for multiple episodes in optimized batches
   * Downloads base artwork ONCE, then processes 10 episodes at a time in parallel
   */
  generateBatch: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      episodeIds: z.array(z.string()).optional(), // If not provided, generate for all episodes
      batchSize: z.number().default(10), // Process 10 episodes at a time in parallel
    }))
    .mutation(async ({ input }) => {
      const { projectId, episodeIds, batchSize } = input;

      // Get episodes to process
      const allEpisodes = await getProjectEpisodes(projectId);
      const episodesToProcess = episodeIds
        ? allEpisodes.filter((ep: any) => episodeIds.includes(ep.id))
        : allEpisodes;

      if (episodesToProcess.length === 0) {
        return {
          success: false,
          message: 'No episodes to process',
          processed: 0,
          total: 0,
        };
      }

      // Get template for this project
      const template = await getProjectTemplate(projectId);

      if (!template || !template.baseArtworkUrl) {
        return {
          success: false,
          message: 'No template configured for this project',
          processed: 0,
          total: episodesToProcess.length,
        };
      }

      // Prepare episode data for batch generation
      const episodesWithNumbers = episodesToProcess
        .filter((ep: any) => ep.episodeNumber)
        .map((ep: any) => ({ 
          id: ep.id, 
          episodeNumber: ep.episodeNumber.toString(),
          isBonus: ep.isBonus === 'true'
        }));

      // Generate all artwork in optimized batches
      // This downloads base artwork ONCE and processes in parallel batches
      console.log(`[Batch Router] Starting optimized batch generation for ${episodesWithNumbers.length} episodes`);
      
      const artworkResults = await generateBatchArtwork(
        episodesWithNumbers,
        {
          baseImageUrl: template.baseArtworkUrl,
          episodeNumber: '', // Will be overridden per episode
          isBonus: false, // Will be overridden per episode
          numberPosition: template.episodeNumberPosition || 'top-right',
          fontSize: parseInt(template.episodeNumberSize || '100'),
          fontColor: template.episodeNumberColor || '#FFFFFF',
          fontFamily: template.episodeNumberFont || 'Arial',
          backgroundColor: template.episodeNumberBgColor || '#000000',
          backgroundOpacity: parseFloat(template.episodeNumberBgOpacity || '0.8'),
          labelFormat: template.labelFormat || 'number',
          customPrefix: template.customPrefix || '',
          customSuffix: template.customSuffix || '',
          borderRadius: parseInt(template.borderRadius || '8'),
          bonusNumberingMode: template.bonusNumberingMode || 'included',
          bonusLabel: template.bonusLabel || 'Bonus',
          bonusPrefix: template.bonusPrefix || '',
          bonusSuffix: template.bonusSuffix || '',
          showNavigation: template.showNavigation === 'true',
          navigationPosition: template.navigationPosition || 'bottom-center',
          navigationStyle: template.navigationStyle || 'arrows',
        },
        batchSize
      );

      // Update all episodes with their generated artwork URLs in parallel
      console.log(`[Batch Router] Updating ${artworkResults.size} episodes with generated artwork URLs`);
      
      const updatePromises = Array.from(artworkResults.entries()).map(([episodeId, artworkUrl]) =>
        updateEpisode(episodeId, { generatedArtworkUrl: artworkUrl }).catch(err => {
          console.error(`Failed to update episode ${episodeId}:`, err);
          return null;
        })
      );

      await Promise.all(updatePromises);

      const processed = artworkResults.size;
      const failed = episodesWithNumbers.length - processed;

      console.log(`[Batch Router] Complete! ${processed} succeeded, ${failed} failed`);

      return {
        success: true,
        processed,
        total: episodesToProcess.length,
        failed,
      };
    }),

  /**
   * Get progress of ongoing artwork generation
   * (In a production app, you'd use a job queue like Bull/BullMQ)
   */
  getProgress: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input }) => {
      // For now, we'll just count how many episodes have artwork
      const episodes = await getProjectEpisodes(input.projectId);
      const withArtwork = episodes.filter((ep: any) => ep.generatedArtworkUrl).length;

      return {
        total: episodes.length,
        completed: withArtwork,
        inProgress: 0, // Would track this with a job queue
      };
    }),
});
