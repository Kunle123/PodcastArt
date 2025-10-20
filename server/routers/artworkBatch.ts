import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { generateEpisodeArtwork } from '../utils/artworkGenerator';
import { getProjectEpisodes, updateEpisode, getProjectTemplate } from '../db';

export const artworkBatchRouter = router({
  /**
   * Generate artwork for multiple episodes in batches
   * Returns progress updates as it processes
   */
  generateBatch: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      episodeIds: z.array(z.string()).optional(), // If not provided, generate for all episodes
      batchSize: z.number().default(10), // Process 10 episodes at a time
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

      if (!template) {
        return {
          success: false,
          message: 'No template configured for this project',
          processed: 0,
          total: episodesToProcess.length,
        };
      }

      // Process episodes in batches
      let processed = 0;
      const errors: Array<{ episodeId: string; error: string }> = [];

      for (let i = 0; i < episodesToProcess.length; i += batchSize) {
        const batch = episodesToProcess.slice(i, i + batchSize);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(async (episode: any) => {
            try {
              const artworkUrl = await generateEpisodeArtwork({
                baseImageUrl: template.baseArtworkUrl || '',
                episodeNumber: episode.episodeNumber?.toString() || '?',
                isBonus: episode.isBonus === 'true',
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
              });

              // Update episode with generated artwork URL
              await updateEpisode(episode.id, { generatedArtworkUrl: artworkUrl });

              return { success: true, episodeId: episode.id };
            } catch (error) {
              console.error(`Error generating artwork for episode ${episode.id}:`, error);
              return {
                success: false,
                episodeId: episode.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        // Count successes and failures
        results.forEach((result: any) => {
          if (result.status === 'fulfilled' && result.value.success) {
            processed++;
          } else if (result.status === 'fulfilled' && !result.value.success) {
            errors.push({
              episodeId: result.value.episodeId,
              error: result.value.error || 'Unknown error',
            });
          } else if (result.status === 'rejected') {
            errors.push({
              episodeId: 'unknown',
              error: result.reason?.message || 'Unknown error',
            });
          }
        });
      }

      return {
        success: true,
        processed,
        total: episodesToProcess.length,
        errors: errors.length > 0 ? errors : undefined,
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

