import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { artworkBatchRouter } from "./routers/artworkBatch";
import { downloadRouter } from "./routers/download";
import { z } from "zod";
import { uploadRouter } from "./routers/upload";
import { paymentRouter } from "./routers/payment";
import { syncRouter } from "./routers/sync";
import { rssFeedRouter } from "./routers/rssFeed";

export const appRouter = router({
  system: systemRouter,
  upload: uploadRouter,
  payment: paymentRouter,
  sync: syncRouter,
  rssFeed: rssFeedRouter,

  // Database migration endpoint (temporary)
  migrate: router({
    addTemplateFields: publicProcedure
      .mutation(async () => {
        // Import mysql2 directly for raw SQL execution
        const mysql = await import('mysql2/promise');
        
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }

        let connection;
        const results = [];
        
        try {
          // Create direct mysql2 connection
          connection = await mysql.createConnection(process.env.DATABASE_URL);
          console.log('[Migration] Database connection established');
          
          // Template table columns - using proper MySQL syntax
          const templateColumns = [
            { name: 'borderRadius', sql: "ALTER TABLE templates ADD COLUMN borderRadius VARCHAR(16) DEFAULT '8'" },
            { name: 'labelFormat', sql: "ALTER TABLE templates ADD COLUMN labelFormat VARCHAR(16) DEFAULT 'number'" },
            { name: 'customPrefix', sql: "ALTER TABLE templates ADD COLUMN customPrefix VARCHAR(32) DEFAULT ''" },
            { name: 'customSuffix', sql: "ALTER TABLE templates ADD COLUMN customSuffix VARCHAR(32) DEFAULT ''" },
            { name: 'customPositionX', sql: "ALTER TABLE templates ADD COLUMN customPositionX VARCHAR(16) DEFAULT '0.25'" },
            { name: 'customPositionY', sql: "ALTER TABLE templates ADD COLUMN customPositionY VARCHAR(16) DEFAULT '0.25'" },
            { name: 'bonusNumberingMode', sql: "ALTER TABLE templates ADD COLUMN bonusNumberingMode VARCHAR(16) DEFAULT 'included'" },
            { name: 'bonusLabel', sql: "ALTER TABLE templates ADD COLUMN bonusLabel VARCHAR(32) DEFAULT 'Bonus'" },
            { name: 'bonusPrefix', sql: "ALTER TABLE templates ADD COLUMN bonusPrefix VARCHAR(32) DEFAULT ''" },
            { name: 'bonusSuffix', sql: "ALTER TABLE templates ADD COLUMN bonusSuffix VARCHAR(32) DEFAULT ''" },
          ];

          for (const col of templateColumns) {
            try {
              await connection.execute(col.sql);
              results.push(`✅ templates.${col.name}`);
            } catch (error: any) {
              // Check both error.code and error.cause for duplicate column detection
              const isDuplicate = 
                error.code === 'ER_DUP_FIELDNAME' || 
                error.errno === 1060 ||
                (error.cause && error.cause.code === 'ER_DUP_FIELDNAME');
              
              if (isDuplicate) {
                results.push(`⏭️ templates.${col.name} already exists`);
              } else {
                console.error(`[Migration] Error for ${col.name}:`, error);
                const errorMsg = error.message || error.sqlMessage || error.code || JSON.stringify(error);
                results.push(`❌ templates.${col.name}: ${errorMsg} | Code: ${error.code} | Errno: ${error.errno}`);
              }
            }
          }
          
          // Episodes table column
          try {
            await connection.execute(
              "ALTER TABLE episodes ADD COLUMN isBonus ENUM('true', 'false') NOT NULL DEFAULT 'false'"
            );
            results.push(`✅ episodes.isBonus`);
          } catch (error: any) {
            // Check both error.code and error.cause for duplicate column detection
            const isDuplicate = 
              error.code === 'ER_DUP_FIELDNAME' || 
              error.errno === 1060 ||
              (error.cause && error.cause.code === 'ER_DUP_FIELDNAME');
            
            if (isDuplicate) {
              results.push(`⏭️ episodes.isBonus already exists`);
            } else {
              console.error('[Migration] Error for isBonus:', error);
              const errorMsg = error.message || error.sqlMessage || error.code || JSON.stringify(error);
              results.push(`❌ episodes.isBonus: ${errorMsg} | Code: ${error.code} | Errno: ${error.errno}`);
            }
          }
          
          return { success: true, results };
        } catch (error: any) {
          console.error('[Migration] Fatal error:', error);
          throw new Error(`Migration failed: ${error.message}`);
        } finally {
          // Always close the connection
          if (connection) {
            await connection.end();
            console.log('[Migration] Database connection closed');
          }
        }
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Projects router
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserProjects } = await import('./db');
      return getUserProjects(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        rssFeedUrl: z.string().url().optional(),
        platform: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createProject, createTemplate } = await import('./db');
        const { nanoid } = await import('nanoid');
        
        const project = {
          id: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          rssFeedUrl: input.rssFeedUrl || null,
          platform: input.platform || null,
          platformApiKey: null,
          platformPodcastId: null,
        };

        await createProject(project);
        
        // Create default template for the project
        const defaultTemplate = {
          id: nanoid(),
          projectId: project.id,
          name: 'Default Template',
          baseArtworkUrl: null, // Will be set when RSS feed is imported
          showEpisodeNumber: 'true' as const,
          episodeNumberPosition: 'top-right',
          episodeNumberFont: 'Arial',
          episodeNumberSize: '120',
          episodeNumberColor: '#FFFFFF',
          episodeNumberBgColor: '#000000',
          episodeNumberBgOpacity: '0.8',
          showNavigation: 'true' as const,
          navigationPosition: 'bottom-center',
          navigationStyle: 'arrows',
          isActive: 'true' as const,
        };
        
        await createTemplate(defaultTemplate);
        
        return project;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getProject } = await import('./db');
        const project = await getProject(input.id);
        
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }
        
        return project;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        rssFeedUrl: z.string().url().optional(),
        platform: z.string().optional(),
        platformApiKey: z.string().optional(),
        platformPodcastId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, updateProject } = await import('./db');
        const project = await getProject(input.id);
        
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const { id, ...updates } = input;
        await updateProject(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, deleteProject } = await import('./db');
        const project = await getProject(input.id);
        
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        await deleteProject(input.id);
        return { success: true };
      }),

    importRss: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        rssFeedUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, createEpisodes, updateProject, getProjectTemplate, updateTemplate } = await import('./db');
        const { parseRssFeed } = await import('./utils/rssParser');
        const { nanoid } = await import('nanoid');
        const { checkEpisodeLimit } = await import('./utils/usageLimits');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        // Parse RSS feed
        const feed = await parseRssFeed(input.rssFeedUrl);
        
        // Check usage limits for free users
        if (ctx.user.subscriptionPlan === 'free' && feed.episodes.length > 10) {
          throw new Error('Free plan is limited to 10 episodes. Upgrade to Pro for unlimited episodes.');
        }

        // Update template with podcast artwork if available
        const template = await getProjectTemplate(input.projectId);
        if (template && feed.artworkUrl && !template.baseArtworkUrl) {
          await updateTemplate(template.id, { baseArtworkUrl: feed.artworkUrl });
        }

        // Create episodes
        const episodes = feed.episodes.map(ep => ({
          id: nanoid(),
          projectId: input.projectId,
          title: ep.title,
          episodeNumber: ep.episodeNumber || null,
          seasonNumber: ep.seasonNumber || null,
          description: ep.description || null,
          originalArtworkUrl: ep.artworkUrl || null,
          generatedArtworkUrl: null,
          audioUrl: ep.audioUrl || null,
          publishedAt: ep.publishedAt || null,
          guid: ep.guid || null,
        }));

        await createEpisodes(episodes);

        // Update project with RSS feed URL and podcast artwork
        await updateProject(input.projectId, { 
          rssFeedUrl: input.rssFeedUrl,
          podcastArtworkUrl: feed.artworkUrl || null,
        });

        return {
          success: true,
          episodeCount: episodes.length,
          podcastTitle: feed.title,
        };
      }),
  }),

  // Episodes router
  episodes: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getProject, getProjectEpisodes } = await import('./db');
        const project = await getProject(input.projectId);
        
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        return getProjectEpisodes(input.projectId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        generatedArtworkUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await import('./db');
        const updateEpisode = db.updateEpisode;
        await updateEpisode(input.id, { generatedArtworkUrl: input.generatedArtworkUrl || null });
        return { success: true };
      }),

    toggleBonus: protectedProcedure
      .input(z.object({
        id: z.string(),
        isBonus: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getEpisode, updateEpisode, getProject } = await import('./db');
        
        // Verify ownership through project
        const episode = await getEpisode(input.id);
        if (!episode) {
          throw new Error('Episode not found');
        }
        
        const project = await getProject(episode.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Not authorized');
        }
        
        await updateEpisode(input.id, { isBonus: input.isBonus ? 'true' : 'false' });
        return { success: true, isBonus: input.isBonus };
      }),

    importRss: protectedProcedure
      .input(z.object({ 
        projectId: z.string(), 
        rssUrl: z.string(),
        clearExisting: z.boolean().optional().default(false),
        useSequentialNumbers: z.boolean().optional().default(false),
        startNumber: z.number().optional().default(1)
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, createEpisodes, getProjectTemplate, updateTemplate, updateProject, getProjectEpisodes } = await import('./db');
        const { parseRssFeed } = await import('./utils/rssParser');
        const { nanoid } = await import('nanoid');
        const { getDb } = await import('./db');
        const { episodes: episodesTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const parsedFeed = await parseRssFeed(input.rssUrl);
        
        // Cache artwork in Backblaze if available
        let cachedArtworkUrl = parsedFeed.artworkUrl;
        if (parsedFeed.artworkUrl) {
          const { cacheArtwork } = await import('./utils/artworkCache');
          const backblazeUrl = await cacheArtwork(parsedFeed.artworkUrl, input.projectId);
          if (backblazeUrl) {
            cachedArtworkUrl = backblazeUrl;
            console.log(`[Import] Artwork cached to Backblaze: ${backblazeUrl}`);
          } else {
            console.warn(`[Import] Failed to cache artwork, using original URL`);
          }
        }
        
        // Update template with cached artwork (always update to use latest Backblaze URL)
        const template = await getProjectTemplate(input.projectId);
        if (template && cachedArtworkUrl) {
          await updateTemplate(template.id, { baseArtworkUrl: cachedArtworkUrl });
          console.log(`[Import] Updated template baseArtworkUrl to: ${cachedArtworkUrl}`);
        }
        
        // Clear existing episodes if requested (or if this is a re-import)
        const existingEpisodes = await getProjectEpisodes(input.projectId);
        if (input.clearExisting && existingEpisodes.length > 0) {
          const db = await getDb();
          if (db) {
            await db.delete(episodesTable).where(eq(episodesTable.projectId, input.projectId));
            console.log(`Cleared ${existingEpisodes.length} existing episodes`);
          }
        }
        
        // Get existing GUIDs to avoid duplicates
        const existingGuids = new Set(
          input.clearExisting ? [] : existingEpisodes.filter(ep => ep.guid).map(ep => ep.guid!)
        );
        
        // Filter out episodes that already exist (by GUID)
        const newEpisodes = parsedFeed.episodes.filter(ep => !ep.guid || !existingGuids.has(ep.guid));
        
        console.log(`Importing ${newEpisodes.length} new episodes (${parsedFeed.episodes.length} total in feed, ${existingGuids.size} already imported)`);
        
        // Create episodes with numbering based on user preference
        const episodesToInsert = newEpisodes.map((ep: any, index: number) => {
          let episodeNumber: string;
          
          if (input.useSequentialNumbers) {
            // User wants sequential numbering starting from their chosen number
            episodeNumber = (input.startNumber + index).toString();
          } else {
            // Use episode number from RSS feed
            episodeNumber = ep.episodeNumber?.toString() || null;
            
            // If no episode number in RSS, calculate a fallback
            if (!episodeNumber) {
              // Try to extract from title
              const titleMatch = ep.title?.match(/(?:episode|ep\.?|#)\s*(\d+)/i);
              if (titleMatch) {
                episodeNumber = titleMatch[1];
              } else {
                // Use index + 1 as last resort
                episodeNumber = (index + 1).toString();
              }
            }
          }
          
          return {
            id: nanoid(),
            projectId: input.projectId,
            title: ep.title,
            description: ep.description || null,
            audioUrl: ep.audioUrl || null,
            publishedAt: ep.publishedAt,
            episodeNumber,
            seasonNumber: ep.seasonNumber?.toString() || null,
            originalArtworkUrl: ep.artworkUrl || null,
            generatedArtworkUrl: null,
            guid: ep.guid || null,
          };
        });

        if (episodesToInsert.length > 0) {
          await createEpisodes(episodesToInsert);
          const numberingMethod = input.useSequentialNumbers ? 'sequential numbering' : 'RSS feed numbers';
          console.log(`Created ${episodesToInsert.length} episodes using ${numberingMethod}`);
        }
        
        // Update project with podcast artwork AND RSS feed URL
        console.log(`[Import] Updating project ${input.projectId} with artwork URL: ${cachedArtworkUrl}`);
        await updateProject(input.projectId, { 
          rssFeedUrl: input.rssUrl,
          podcastArtworkUrl: cachedArtworkUrl || null,
        });
        console.log(`[Import] Project updated successfully`);
        
        // Verify the update
        const updatedProject = await getProject(input.projectId);
        console.log(`[Import] Verified project artwork URL: ${updatedProject?.podcastArtworkUrl}`);
        
        return { 
          success: true, 
          count: episodesToInsert.length,
          total: parsedFeed.episodes.length,
          skipped: parsedFeed.episodes.length - episodesToInsert.length
        };
      }),

    autoNumber: protectedProcedure
      .input(z.object({ 
        projectId: z.string(),
        mode: z.enum(['sequential', 'custom']).optional().default('sequential'),
        startNumber: z.number().optional().default(1)
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, getProjectEpisodes, updateEpisode } = await import('./db');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const episodes = await getProjectEpisodes(input.projectId);
        
        // Renumber episodes sequentially starting from the chosen number
        // Episodes are already sorted by episode number (descending), so reverse to get oldest first
        const sortedEpisodes = [...episodes].reverse();
        
        let updateCount = 0;
        for (let i = 0; i < sortedEpisodes.length; i++) {
          const newNumber = (input.startNumber + i).toString();
          await updateEpisode(sortedEpisodes[i].id, { episodeNumber: newNumber });
          updateCount++;
        }
        
        console.log(`[Auto Number] Renumbered ${updateCount} episodes starting from ${input.startNumber}`);
        
        return { success: true, count: updateCount };
      }),
    
    fixEpisodeNumbers: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, getProjectEpisodes, updateEpisode } = await import('./db');
        const { parseRssFeed } = await import('./utils/rssParser');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }
        
        if (!project.rssFeedUrl) {
          throw new Error('Project does not have an RSS feed URL. Please import from RSS first using the "Import RSS Feed" button.');
        }

        // Parse RSS feed to get correct episode numbers
        const feed = await parseRssFeed(project.rssFeedUrl);
        const episodes = await getProjectEpisodes(input.projectId);
        
        let updatedCount = 0;
        
        // Match episodes by GUID and update their numbers and seasons
        for (const episode of episodes) {
          if (!episode.guid) continue;
          
          const feedEpisode = feed.episodes.find(ep => ep.guid === episode.guid);
          if (feedEpisode && (feedEpisode.episodeNumber || feedEpisode.seasonNumber)) {
            const updateData: any = {};
            
            if (feedEpisode.episodeNumber) {
              updateData.episodeNumber = feedEpisode.episodeNumber.toString();
            }
            
            if (feedEpisode.seasonNumber) {
              updateData.seasonNumber = feedEpisode.seasonNumber.toString();
            }
            
            await updateEpisode(episode.id, updateData);
            updatedCount++;
            
            const seasonInfo = feedEpisode.seasonNumber ? `S${feedEpisode.seasonNumber}E${feedEpisode.episodeNumber}` : feedEpisode.episodeNumber;
            console.log(`Fixed episode: ${episode.title} -> ${seasonInfo}`);
          }
        }
        
        return { 
          success: true, 
          updated: updatedCount,
          total: episodes.length,
          message: `Updated ${updatedCount} out of ${episodes.length} episodes`
        };
      }),
  }),
  // Templates router
  templates: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getProject, getProjectTemplate } = await import('./db');
        const project = await getProject(input.projectId);
        
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        return getProjectTemplate(input.projectId);
      }),

    // Initialize template for existing projects that don't have one
    initialize: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, getProjectTemplate, createTemplate } = await import('./db');
        const { nanoid } = await import('nanoid');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        // Check if template already exists
        const existingTemplate = await getProjectTemplate(input.projectId);
        if (existingTemplate) {
          return { success: true, message: 'Template already exists', templateId: existingTemplate.id };
        }

        // Create default template
        const defaultTemplate = {
          id: nanoid(),
          projectId: input.projectId,
          name: 'Default Template',
          baseArtworkUrl: project.podcastArtworkUrl || null,
          showEpisodeNumber: 'true' as const,
          episodeNumberPosition: 'top-right',
          episodeNumberFont: 'Arial',
          episodeNumberSize: '120',
          episodeNumberColor: '#FFFFFF',
          episodeNumberBgColor: '#000000',
          episodeNumberBgOpacity: '0.8',
          showNavigation: 'true' as const,
          navigationPosition: 'bottom-center',
          navigationStyle: 'arrows',
          isActive: 'true' as const,
        };
        
        await createTemplate(defaultTemplate);
        
        return { success: true, message: 'Template initialized', templateId: defaultTemplate.id };
      }),

    createOrUpdate: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        name: z.string(),
        baseArtworkUrl: z.string().optional(),
        showEpisodeNumber: z.enum(['true', 'false']),
        episodeNumberPosition: z.string(),
        customPositionX: z.string().optional(),
        customPositionY: z.string().optional(),
        episodeNumberFont: z.string(),
        episodeNumberSize: z.string(),
        episodeNumberColor: z.string(),
        episodeNumberBgColor: z.string(),
        episodeNumberBgOpacity: z.string(),
        borderRadius: z.string().optional(),
        labelFormat: z.string().optional(),
        customPrefix: z.string().optional(),
        customSuffix: z.string().optional(),
        bonusNumberingMode: z.string().optional(),
        bonusLabel: z.string().optional(),
        bonusPrefix: z.string().optional(),
        bonusSuffix: z.string().optional(),
        showNavigation: z.enum(['true', 'false']),
        navigationPosition: z.string(),
        navigationStyle: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, getProjectTemplate, createTemplate, updateTemplate } = await import('./db');
        const { nanoid } = await import('nanoid');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const existing = await getProjectTemplate(input.projectId);

        if (existing) {
          await updateTemplate(existing.id, input);
          return { success: true, templateId: existing.id };
        } else {
          const template = {
            id: nanoid(),
            ...input,
            isActive: 'true' as const,
          };
          await createTemplate(template);
          return { success: true, templateId: template.id };
        }
      }),
  }),

  // Artwork generation router
  artwork: router({
    generateSingle: protectedProcedure
      .input(z.object({ episodeId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getEpisode, getProject, getProjectTemplate, updateEpisode } = await import('./db');
        const { generateEpisodeArtwork } = await import('./utils/artworkGenerator');
        
        const episode = await getEpisode(input.episodeId);
        if (!episode) {
          throw new Error('Episode not found');
        }

        const project = await getProject(episode.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const template = await getProjectTemplate(episode.projectId);
        if (!template || !template.baseArtworkUrl) {
          throw new Error('Template not configured');
        }

        if (!episode.episodeNumber) {
          throw new Error('Episode number not set');
        }

        const artworkUrl = await generateEpisodeArtwork({
          episodeNumber: episode.episodeNumber.toString(),
          isBonus: episode.isBonus === 'true',
          baseImageUrl: template.baseArtworkUrl,
          numberPosition: template.episodeNumberPosition || 'top-right',
          fontSize: parseInt(template.episodeNumberSize || '120'),
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

        await updateEpisode(input.episodeId, { generatedArtworkUrl: artworkUrl });

        return { success: true, artworkUrl };
      }),

    generate: protectedProcedure
      .input(z.object({
        projectId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getProject, getProjectEpisodes, getProjectTemplate, updateEpisode } = await import('./db');
        const { generateBatchArtwork } = await import('./utils/artworkGenerator');
        
        const project = await getProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error('Project not found');
        }

        const template = await getProjectTemplate(input.projectId);
        if (!template || !template.baseArtworkUrl) {
          throw new Error('Template not configured');
        }

        const episodes = await getProjectEpisodes(input.projectId);
        if (episodes.length === 0) {
          throw new Error('No episodes found');
        }

        // Generate artwork for all episodes
        const episodesWithNumbers = episodes
          .filter(ep => ep.episodeNumber)
          .map(ep => ({ id: ep.id, episodeNumber: ep.episodeNumber! }));

        const results = await generateBatchArtwork(episodesWithNumbers, {
          baseImageUrl: template.baseArtworkUrl,
          numberPosition: template.episodeNumberPosition || 'top-right',
          fontSize: parseInt(template.episodeNumberSize || '120'),
          fontColor: template.episodeNumberColor || '#FFFFFF',
          fontFamily: template.episodeNumberFont || 'Arial',
          backgroundColor: template.episodeNumberBgColor || '#000000',
          backgroundOpacity: parseFloat(template.episodeNumberBgOpacity || '0.8'),
          showNavigation: template.showNavigation === 'true',
          navigationPosition: template.navigationPosition || 'bottom-center',
          navigationStyle: template.navigationStyle || 'arrows',
        });

        // Update episodes with generated artwork URLs
        for (const [episodeId, artworkUrl] of Array.from(results.entries())) {
          await updateEpisode(episodeId, { generatedArtworkUrl: artworkUrl });
        }

        return {
          success: true,
          generatedCount: results.size,
        };
      }),
  }),

  artworkBatch: artworkBatchRouter,
  download: downloadRouter,
});

export type AppRouter = typeof appRouter;
