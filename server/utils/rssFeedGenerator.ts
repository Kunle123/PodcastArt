import { parseRssFeed } from './rssParser';

interface Episode {
  id: string;
  title: string;
  episodeNumber: string | null;
  seasonNumber: string | null;
  description: string | null;
  originalArtworkUrl: string | null;
  generatedArtworkUrl: string | null;
  audioUrl: string | null;
  publishedAt: Date | null;
  guid: string | null;
}

interface UpdatedRSSFeed {
  originalFeedUrl: string;
  updatedXML: string;
  artworkURLs: Array<{
    episodeNumber: string;
    title: string;
    artworkUrl: string;
  }>;
  episodesUpdated: number;
}

/**
 * Generate an updated RSS feed with new artwork URLs
 */
export async function generateUpdatedRSSFeed(
  rssFeedUrl: string,
  episodes: Episode[]
): Promise<UpdatedRSSFeed> {
  // Parse the original RSS feed
  const originalFeed = await parseRssFeed(rssFeedUrl);

  // Create a map of GUIDs to generated artwork URLs
  const artworkMap = new Map<string, string>();
  const artworkURLs: Array<{ episodeNumber: string; title: string; artworkUrl: string }> = [];

  episodes.forEach((episode) => {
    if (episode.guid && episode.generatedArtworkUrl) {
      artworkMap.set(episode.guid, episode.generatedArtworkUrl);
      artworkURLs.push({
        episodeNumber: episode.episodeNumber || 'N/A',
        title: episode.title,
        artworkUrl: episode.generatedArtworkUrl,
      });
    }
  });

  // Generate updated RSS XML
  const updatedXML = generateRSSXML(originalFeed, artworkMap);

  return {
    originalFeedUrl: rssFeedUrl,
    updatedXML,
    artworkURLs,
    episodesUpdated: artworkMap.size,
  };
}

/**
 * Generate RSS XML with updated artwork URLs
 */
function generateRSSXML(
  feed: any,
  artworkMap: Map<string, string>
): string {
  const escapeXML = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return new Date().toUTCString();
    return new Date(date).toUTCString();
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
  xml += '  <channel>\n';
  xml += `    <title>${escapeXML(feed.title || 'Podcast')}</title>\n`;
  xml += `    <link>${escapeXML(feed.link || '')}</link>\n`;
  xml += `    <description>${escapeXML(feed.description || '')}</description>\n`;
  xml += `    <language>${escapeXML(feed.language || 'en')}</language>\n`;

  // Add podcast-level artwork if available
  if (feed.image) {
    xml += `    <itunes:image href="${escapeXML(feed.image)}"/>\n`;
  }

  // Add episodes
  feed.episodes.forEach((episode: any) => {
    xml += '    <item>\n';
    xml += `      <title>${escapeXML(episode.title || 'Untitled Episode')}</title>\n`;
    
    if (episode.description) {
      xml += `      <description>${escapeXML(episode.description)}</description>\n`;
    }

    if (episode.guid) {
      xml += `      <guid isPermaLink="false">${escapeXML(episode.guid)}</guid>\n`;
    }

    if (episode.publishedAt) {
      xml += `      <pubDate>${formatDate(episode.publishedAt)}</pubDate>\n`;
    }

    // Use updated artwork URL if available, otherwise use original
    const artworkUrl = artworkMap.get(episode.guid) || episode.artworkUrl;
    if (artworkUrl) {
      xml += `      <itunes:image href="${escapeXML(artworkUrl)}"/>\n`;
    }

    if (episode.audioUrl) {
      xml += `      <enclosure url="${escapeXML(episode.audioUrl)}" type="audio/mpeg"/>\n`;
    }

    if (episode.episodeNumber) {
      xml += `      <itunes:episode>${escapeXML(episode.episodeNumber.toString())}</itunes:episode>\n`;
    }

    if (episode.seasonNumber) {
      xml += `      <itunes:season>${escapeXML(episode.seasonNumber.toString())}</itunes:season>\n`;
    }

    xml += '    </item>\n';
  });

  xml += '  </channel>\n';
  xml += '</rss>';

  return xml;
}

/**
 * Generate a simple list of artwork URLs for manual update
 */
export function generateArtworkURLList(episodes: Episode[]): string {
  let list = 'ARTWORK URLs FOR MANUAL UPDATE\n';
  list += '='.repeat(60) + '\n\n';

  episodes
    .filter((ep) => ep.generatedArtworkUrl)
    .sort((a, b) => {
      const numA = parseInt(a.episodeNumber || '0', 10);
      const numB = parseInt(b.episodeNumber || '0', 10);
      return numA - numB;
    })
    .forEach((episode) => {
      list += `Episode ${episode.episodeNumber || 'N/A'}: ${episode.title}\n`;
      list += `${episode.generatedArtworkUrl}\n\n`;
    });

  return list;
}

/**
 * Get platform-specific instructions for updating RSS feed
 */
export function getPlatformInstructions(platform: string): {
  title: string;
  steps: string[];
  notes?: string[];
} {
  const instructions: Record<string, any> = {
    libsyn: {
      title: 'Update Artwork in Libsyn',
      steps: [
        'Log into your Libsyn account at libsyn.com',
        'Go to "Content" → "Episodes"',
        'Click on each episode you want to update',
        'Scroll to "Episode Image" section',
        'Paste the artwork URL from the list below',
        'Click "Save" to update the episode',
        'Repeat for all episodes',
        'Your RSS feed will update automatically',
      ],
      notes: [
        'Changes may take 15-30 minutes to propagate to podcast apps',
        'You can update multiple episodes at once using Libsyn\'s bulk editor',
      ],
    },
    'rss.com': {
      title: 'Update Artwork in RSS.com',
      steps: [
        'Log into your RSS.com account',
        'Go to your podcast dashboard',
        'Click "Episodes" in the sidebar',
        'Click on each episode to edit',
        'Upload or paste the artwork URL in the "Episode Image" field',
        'Click "Save Changes"',
        'Repeat for all episodes',
      ],
      notes: [
        'RSS.com may cache images, so changes might take a few minutes',
      ],
    },
    spreaker: {
      title: 'Update Artwork in Spreaker',
      steps: [
        'Log into your Spreaker account',
        'Go to "My Shows" → Select your podcast',
        'Click "Episodes" tab',
        'Click on each episode to edit',
        'Upload the new artwork image (download from URL first)',
        'Click "Save"',
        'Repeat for all episodes',
      ],
      notes: [
        'Spreaker requires image upload, not URL paste',
        'Download the artwork files first, then upload to Spreaker',
      ],
    },
    generic: {
      title: 'Update Artwork in Your Hosting Platform',
      steps: [
        'Log into your podcast hosting platform',
        'Navigate to your podcast\'s episode list',
        'Open each episode\'s settings/edit page',
        'Look for "Episode Image", "Episode Artwork", or similar field',
        'Either paste the artwork URL or upload the downloaded image',
        'Save the changes',
        'Repeat for all episodes',
      ],
      notes: [
        'Most podcast hosting platforms automatically update their RSS feed',
        'Changes typically propagate to podcast apps within 24 hours',
        'Some platforms may require manual RSS feed refresh',
      ],
    },
  };

  return instructions[platform] || instructions.generic;
}

