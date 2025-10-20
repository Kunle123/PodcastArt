import { getDb } from '../db';
import { projects, episodes } from '../../drizzle/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { parseRssFeed } from '../utils/rssParser';
// import { generateArtworkForEpisode } from '../utils/artworkGenerator';
import { nanoid } from 'nanoid';

export async function syncAllProjects() {
  console.log('[RSS Sync] Starting sync job...');
  
  const db = await getDb();
  if (!db) {
    console.error('[RSS Sync] Database not available');
    return;
  }

  try {
    // Get all projects with RSS feeds and auto-sync enabled
    const projectsToSync = await db
      .select()
      .from(projects)
      .where(
        and(
          isNotNull(projects.rssFeedUrl),
          eq(projects.autoSync, 'enabled')
        )
      );

    console.log(`[RSS Sync] Found ${projectsToSync.length} projects to sync`);

    for (const project of projectsToSync) {
      try {
        await syncProject(project);
      } catch (error) {
        console.error(`[RSS Sync] Error syncing project ${project.id}:`, error);
      }
    }

    console.log('[RSS Sync] Sync job completed');
  } catch (error) {
    console.error('[RSS Sync] Fatal error:', error);
  }
}

async function syncProject(project: any) {
  if (!project.rssFeedUrl) return;

  console.log(`[RSS Sync] Syncing project: ${project.name} (${project.id})`);

  const db = await getDb();
  if (!db) return;

  try {
    // Parse RSS feed
    const feed = await parseRssFeed(project.rssFeedUrl);

    // Get existing episode GUIDs
    const existingEpisodes = await db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, project.id));

    const existingGuids = new Set(
      existingEpisodes.map(ep => ep.guid).filter(Boolean)
    );

    // Find new episodes
    const newEpisodes = feed.episodes.filter(
      (ep: any) => ep.guid && !existingGuids.has(ep.guid)
    );

    if (newEpisodes.length === 0) {
      console.log(`[RSS Sync] No new episodes for project ${project.id}`);
      
      // Update lastSyncedAt
      await db
        .update(projects)
        .set({ lastSyncedAt: new Date() })
        .where(eq(projects.id, project.id));
      
      return;
    }

    console.log(`[RSS Sync] Found ${newEpisodes.length} new episodes for project ${project.id}`);

    // Import new episodes with proper episode numbers from feed
    for (let i = 0; i < newEpisodes.length; i++) {
      const ep = newEpisodes[i];
      const episodeId = nanoid();
      
      // Use episode number from feed if available, otherwise calculate
      let episodeNumber: string;
      if (ep.episodeNumber) {
        episodeNumber = ep.episodeNumber.toString();
      } else {
        // Fallback: calculate from max existing episode number
        const maxEpisodeNumber = Math.max(
          0,
          ...existingEpisodes.map(e => parseInt(e.episodeNumber || '0', 10))
        );
        episodeNumber = (maxEpisodeNumber + i + 1).toString();
      }

      // Insert episode
      await db.insert(episodes).values({
        id: episodeId,
        projectId: project.id,
        title: ep.title,
        episodeNumber,
        seasonNumber: ep.seasonNumber ? ep.seasonNumber.toString() : null,
        description: ep.description || null,
        originalArtworkUrl: ep.artworkUrl || null,
        generatedArtworkUrl: null,
        audioUrl: ep.audioUrl || null,
        publishedAt: ep.publishedAt || null,
        guid: ep.guid || null,
        isBonus: 'false', // Default to not bonus for new episodes
      });

      console.log(`[RSS Sync] Imported episode ${episodeNumber}: ${ep.title}`);

      // Generate artwork if template exists
      try {
        const { getProjectTemplate } = await import('../db');
        const template = await getProjectTemplate(project.id);

        if (template && template.baseArtworkUrl) {
          console.log(`[RSS Sync] Template found, artwork generation will be done on-demand`);
          // Artwork generation will be done when user clicks "Generate Artwork"
          // or can be triggered automatically here if needed
        } else {
          console.log(`[RSS Sync] No template found, skipping artwork generation`);
        }
      } catch (error) {
        console.error(`[RSS Sync] Error generating artwork for episode ${episodeId}:`, error);
      }
    }

    // Update lastSyncedAt
    await db
      .update(projects)
      .set({ lastSyncedAt: new Date() })
      .where(eq(projects.id, project.id));

    console.log(`[RSS Sync] Successfully synced ${newEpisodes.length} episodes for project ${project.id}`);

    // TODO: Send email notification to user
    // await sendEmailNotification(project.userId, project.name, newEpisodes.length);

  } catch (error) {
    console.error(`[RSS Sync] Error syncing project ${project.id}:`, error);
    throw error;
  }
}

// Start the sync job (runs every hour)
let syncInterval: NodeJS.Timeout | null = null;

export function startRssSyncJob() {
  if (syncInterval) {
    console.log('[RSS Sync] Job already running');
    return;
  }

  console.log('[RSS Sync] Starting background job (runs every hour)');
  
  // Run immediately on start
  syncAllProjects();

  // Then run every hour
  syncInterval = setInterval(() => {
    syncAllProjects();
  }, 60 * 60 * 1000); // 1 hour
}

export function stopRssSyncJob() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[RSS Sync] Background job stopped');
  }
}

