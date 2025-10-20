// Utility to download and cache podcast artwork in Backblaze
import { backblazeStoragePut } from '../backblazeStorage';
import { nanoid } from 'nanoid';

/**
 * Download artwork from external URL and cache it in Backblaze
 * @param artworkUrl - External artwork URL
 * @param projectId - Project ID for organizing files
 * @returns Backblaze public URL or null if failed
 */
export async function cacheArtwork(
  artworkUrl: string,
  projectId: string
): Promise<string | null> {
  try {
    console.log(`[Artwork Cache] Downloading: ${artworkUrl}`);
    
    // Download the image
    const response = await fetch(artworkUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastArtworkStudio/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`[Artwork Cache] Failed to download: ${response.status} ${response.statusText}`);
      return null;
    }

    // Get the image data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Extract file extension from content type or URL
    let ext = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      ext = 'jpg';
    } else if (contentType.includes('png')) {
      ext = 'png';
    } else if (contentType.includes('webp')) {
      ext = 'webp';
    }

    // Generate a unique key for the artwork
    const filename = `${projectId}-${nanoid(8)}.${ext}`;
    const key = `podcast-artwork/${filename}`;

    console.log(`[Artwork Cache] Uploading to Backblaze: ${key}`);

    // Upload to Backblaze
    const result = await backblazeStoragePut(key, buffer, contentType);

    console.log(`[Artwork Cache] ✅ Cached successfully: ${result.url}`);

    return result.url;
  } catch (error) {
    console.error('[Artwork Cache] Error caching artwork:', error);
    return null;
  }
}

