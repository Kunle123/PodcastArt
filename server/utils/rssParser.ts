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
  if (feed.itunes?.image) {
    podcastArtwork = feed.itunes.image;
  } else if (feed.image?.url) {
    podcastArtwork = feed.image.url;
  }

  return {
    title: feed.title || 'Untitled Podcast',
    description: feed.description || undefined,
    artworkUrl: podcastArtwork,
    episodes,
  };
}

