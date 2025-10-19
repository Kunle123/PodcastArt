import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { backblazeStoragePut } from '../backblazeStorage';

export const uploadRouter = router({
  uploadBaseArtwork: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fileData: z.string(), // base64 encoded file data
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Decode base64 file data
      const buffer = Buffer.from(input.fileData, 'base64');
      
      // Generate unique file path
      const fileExtension = input.fileName.split('.').pop() || 'jpg';
      const filePath = `projects/${input.projectId}/base-artwork-${Date.now()}.${fileExtension}`;
      
      // Upload to S3
      const { url, key } = await backblazeStoragePut(filePath, buffer, input.mimeType);
      
      return {
        success: true,
        url,
        key,
      };
    }),
});

