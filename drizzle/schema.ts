import { mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "pro", "lifetime"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 64 }),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Podcast projects - each user can have multiple podcasts
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: text("name").notNull(),
  rssFeedUrl: text("rssFeedUrl"),
  podcastArtworkUrl: text("podcastArtworkUrl"),
  platform: varchar("platform", { length: 64 }), // buzzsprout, podbean, spotify, etc.
  platformApiKey: text("platformApiKey"), // encrypted API key/token
  platformPodcastId: varchar("platformPodcastId", { length: 128 }),
  autoSync: mysqlEnum("autoSync", ["enabled", "disabled"]).default("enabled"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Episodes imported from RSS feed
export const episodes = mysqlTable("episodes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  title: text("title").notNull(),
  episodeNumber: varchar("episodeNumber", { length: 32 }),
  seasonNumber: varchar("seasonNumber", { length: 32 }),
  description: text("description"),
  originalArtworkUrl: text("originalArtworkUrl"),
  generatedArtworkUrl: text("generatedArtworkUrl"),
  audioUrl: text("audioUrl"),
  publishedAt: timestamp("publishedAt"),
  guid: text("guid"),
  isBonus: mysqlEnum("isBonus", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = typeof episodes.$inferInsert;

// Artwork templates - design settings for each project
export const templates = mysqlTable("templates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  name: text("name").notNull(),
  baseArtworkUrl: text("baseArtworkUrl"), // base image to overlay numbers on
  
  // Episode number styling
  showEpisodeNumber: mysqlEnum("showEpisodeNumber", ["true", "false"]).default("true").notNull(),
  episodeNumberPosition: varchar("episodeNumberPosition", { length: 32 }).default("top-right"),
  customPositionX: varchar("customPositionX", { length: 16 }).default("0.25"), // For custom positioning (0-1 range)
  customPositionY: varchar("customPositionY", { length: 16 }).default("0.25"), // For custom positioning (0-1 range)
  episodeNumberFont: varchar("episodeNumberFont", { length: 128 }).default("Arial"),
  episodeNumberSize: varchar("episodeNumberSize", { length: 16 }).default("120"),
  episodeNumberColor: varchar("episodeNumberColor", { length: 16 }).default("#FFFFFF"),
  episodeNumberBgColor: varchar("episodeNumberBgColor", { length: 16 }).default("#000000"),
  episodeNumberBgOpacity: varchar("episodeNumberBgOpacity", { length: 8 }).default("0.8"),
  borderRadius: varchar("borderRadius", { length: 16 }).default("8"),
  labelFormat: varchar("labelFormat", { length: 16 }).default("number"), // number, ep, episode, custom
  customPrefix: varchar("customPrefix", { length: 32 }).default(""),
  customSuffix: varchar("customSuffix", { length: 32 }).default(""),
  
  // Bonus episode configuration
  bonusNumberingMode: varchar("bonusNumberingMode", { length: 16 }).default("included"), // included, separate, none
  bonusLabel: varchar("bonusLabel", { length: 32 }).default("Bonus"), // "Bonus", "Special", "Extra", etc.
  bonusPrefix: varchar("bonusPrefix", { length: 32 }).default(""),
  bonusSuffix: varchar("bonusSuffix", { length: 32 }).default(""),
  
  // Navigation indicators
  showNavigation: mysqlEnum("showNavigation", ["true", "false"]).default("true").notNull(),
  navigationPosition: varchar("navigationPosition", { length: 32 }).default("bottom-center"),
  navigationStyle: varchar("navigationStyle", { length: 32 }).default("arrows"), // arrows, text, both
  
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

// Upload jobs - track batch upload progress
export const uploadJobs = mysqlTable("uploadJobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending"), // pending, processing, completed, failed
  totalEpisodes: varchar("totalEpisodes", { length: 16 }).default("0"),
  completedEpisodes: varchar("completedEpisodes", { length: 16 }).default("0"),
  failedEpisodes: varchar("failedEpisodes", { length: 16 }).default("0"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type UploadJob = typeof uploadJobs.$inferSelect;
export type InsertUploadJob = typeof uploadJobs.$inferInsert;
