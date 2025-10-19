import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getProjectEpisodes, getProject } from '../db';
import archiver from 'archiver';
import { Readable } from 'stream';

export const downloadRouter = router({
  /**
   * Generate and download ZIP file of all episode artwork
   */
  generateZip: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProject(input.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const episodes = await getProjectEpisodes(input.projectId);
      const episodesWithArtwork = episodes.filter((ep: any) => ep.generatedArtworkUrl);

      if (episodesWithArtwork.length === 0) {
        throw new Error('No generated artwork found. Please generate artwork first.');
      }

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      const chunks: Buffer[] = [];
      
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Download each artwork and add to ZIP
      for (const episode of episodesWithArtwork) {
        try {
          if (!episode.generatedArtworkUrl) continue;
          const response = await fetch(episode.generatedArtworkUrl);
          if (!response.ok) continue;

          const buffer = Buffer.from(await response.arrayBuffer());
          const episodeNum = String(episode.episodeNumber || 0).padStart(3, '0');
          const filename = `episode-${episodeNum}.png`;

          archive.append(buffer, { name: filename });
        } catch (error) {
          console.error(`Failed to download artwork for episode ${episode.id}:`, error);
        }
      }

      await archive.finalize();

      // Wait for all chunks to be collected
      await new Promise((resolve) => {
        archive.on('end', resolve);
      });

      const zipBuffer = Buffer.concat(chunks);
      const base64Zip = zipBuffer.toString('base64');

      return {
        success: true,
        filename: `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-artwork.zip`,
        data: base64Zip,
        fileCount: episodesWithArtwork.length,
      };
    }),
});

