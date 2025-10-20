import Parser from 'rss-parser';

interface PodcastEpisode {
  title: string;
  episodeNumber?: string;
  seasonNumber?: string;
  description?: string;
  artworkUrl?: string;
  audioUrl?: string;
  publishedAt?: Date;
  guid?: string;
}

interface PodcastFeed {
  title: string;
  description?: string;
  artworkUrl?: string;
  episodes: PodcastEpisode[];
}

export async function parseRssFeed(feedUrl: string): Promise<PodcastFeed> {
  const parser = new Parser({
    customFields: {
      feed: [
        ['itunes:image', 'itunesImage'],
        ['image', 'feedImage'], // Explicitly capture RSS <image> tag
      ],
      item: [
        ['itunes:episode', 'itunesEpisode'],
        ['itunes:season', 'itunesSeason'],
        ['itunes:image', 'itunesImage'],
      ],
    },
  });

  const feed = await parser.parseURL(feedUrl);

  const episodes: PodcastEpisode[] = (feed.items || []).map((item: any) => {
    // Extract episode number from itunes:episode tag or title
    let episodeNumber = item.itunesEpisode || undefined;
    if (!episodeNumber && item.title) {
      // Try to extract episode number from title (e.g., "Episode 5: Title" or "Ep. 5 - Title")
      const match = item.title.match(/(?:episode|ep\.?)\s*(\d+)/i);
      if (match) {
        episodeNumber = match[1];
      }
    }

    // Extract season number
    const seasonNumber = item.itunesSeason || undefined;

    // Get artwork URL from itunes:image or enclosure
    let artworkUrl = undefined;
    if (item.itunesImage) {
      if (typeof item.itunesImage === 'string') {
        artworkUrl = item.itunesImage;
      } else if (item.itunesImage.$ && item.itunesImage.$.href) {
        artworkUrl = item.itunesImage.$.href;
      }
    }

    // Get audio URL from enclosure
    const audioUrl = item.enclosure?.url || undefined;

    return {
      title: item.title || 'Untitled Episode',
      episodeNumber,
      seasonNumber,
      description: item.contentSnippet || item.content || undefined,
      artworkUrl,
      audioUrl,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      guid: item.guid || item.link || undefined,
    };
  });

  // Get podcast-level artwork
  let podcastArtwork = undefined;
  
  // Try multiple sources for podcast artwork
  const feedAny = feed as any;
  
  console.log('[RSS Parser] Checking artwork sources...');
  console.log('[RSS Parser] feed.itunesImage:', feedAny.itunesImage);
  console.log('[RSS Parser] feed.feedImage:', feedAny.feedImage);
  console.log('[RSS Parser] feed.itunes?.image:', feed.itunes?.image);
  console.log('[RSS Parser] feed.image:', feed.image);
  
  // Source 1: Custom itunes:image field (attribute href)
  if (feedAny.itunesImage) {
    if (typeof feedAny.itunesImage === 'string') {
      podcastArtwork = feedAny.itunesImage;
      console.log('[RSS Parser] ✅ Using itunesImage (string)');
    } else if (feedAny.itunesImage.$ && feedAny.itunesImage.$.href) {
      podcastArtwork = feedAny.itunesImage.$.href;
      console.log('[RSS Parser] ✅ Using itunesImage.$.href');
    } else if (feedAny.itunesImage.href) {
      podcastArtwork = feedAny.itunesImage.href;
      console.log('[RSS Parser] ✅ Using itunesImage.href');
    }
  }
  
  // Source 2: Standard itunes.image field
  if (!podcastArtwork && feed.itunes?.image) {
    podcastArtwork = feed.itunes.image;
    console.log('[RSS Parser] ✅ Using feed.itunes.image');
  }
  
  // Source 3: Custom feedImage field (RSS <image><url>)
  if (!podcastArtwork && feedAny.feedImage) {
    if (typeof feedAny.feedImage === 'string') {
      podcastArtwork = feedAny.feedImage;
      console.log('[RSS Parser] ✅ Using feedImage (string)');
    } else if (feedAny.feedImage.url) {
      podcastArtwork = feedAny.feedImage.url;
      console.log('[RSS Parser] ✅ Using feedImage.url');
    }
  }
  
  // Source 4: Standard feed.image.url field (should work by default)
  if (!podcastArtwork && feed.image?.url) {
    podcastArtwork = feed.image.url;
    console.log('[RSS Parser] ✅ Using feed.image.url');
  }
  
  console.log('[RSS Parser] Final artwork URL:', podcastArtwork || '❌ None found');

  // Follow redirects for artwork URL to get the final URL
  if (podcastArtwork) {
    try {
      const response = await fetch(podcastArtwork, { 
        method: 'HEAD',
        redirect: 'follow' 
      });
      if (response.ok && response.url !== podcastArtwork) {
        console.log(`[RSS Parser] ✅ Followed redirect: ${podcastArtwork} → ${response.url}`);
        podcastArtwork = response.url;
      }
    } catch (error) {
      console.warn('[RSS Parser] Failed to check artwork URL redirect:', error);
      // Continue with original URL if redirect check fails
    }
  }

  return {
    title: feed.title || 'Untitled Podcast',
    description: feed.description || undefined,
    artworkUrl: podcastArtwork,
    episodes,
  };
}

