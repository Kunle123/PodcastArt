import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  InsertProject, projects,
  InsertEpisode, episodes,
  InsertTemplate, templates,
  InsertUploadJob, uploadJobs
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(id: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

// Project queries
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(projects).values(project);
  return project;
}

export async function getUserProjects(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProject(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function updateProject(id: string, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related episodes first
  await db.delete(episodes).where(eq(episodes.projectId, id));
  await db.delete(templates).where(eq(templates.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

// Episode queries
export async function createEpisodes(episodeList: InsertEpisode[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (episodeList.length === 0) return;
  await db.insert(episodes).values(episodeList);
}

export async function getEpisode(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectEpisodes(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all episodes for the project
  const allEpisodes = await db.select().from(episodes).where(eq(episodes.projectId, projectId));
  
  // Sort by episode number (descending - newest/highest first), fallback to publish date
  return allEpisodes.sort((a, b) => {
    const aNum = parseInt(a.episodeNumber || '0', 10);
    const bNum = parseInt(b.episodeNumber || '0', 10);
    
    // If both have episode numbers, sort by number (descending - higher number = newer)
    if (aNum > 0 && bNum > 0) {
      return bNum - aNum; // 369 before 368, 2651 before 1
    }
    
    // If one has a number and the other doesn't, prioritize the one with a number
    if (aNum > 0) return -1;
    if (bNum > 0) return 1;
    
    // If neither has episode numbers, sort by publish date (newest first)
    if (a.publishedAt && b.publishedAt) {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    
    // Fallback to creation order (by ID)
    return 0;
  });
}

export async function updateEpisode(id: string, data: Partial<InsertEpisode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(episodes).set({ ...data, updatedAt: new Date() }).where(eq(episodes.id, id));
}

// Template queries
export async function createTemplate(template: InsertTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(templates).values(template);
  return template;
}

export async function getProjectTemplate(projectId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(templates).where(eq(templates.projectId, projectId)).limit(1);
  return result[0];
}

export async function updateTemplate(id: string, data: Partial<InsertTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templates).set({ ...data, updatedAt: new Date() }).where(eq(templates.id, id));
}

// Upload job queries
export async function createUploadJob(job: InsertUploadJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(uploadJobs).values(job);
  return job;
}

export async function getUploadJob(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(uploadJobs).where(eq(uploadJobs.id, id)).limit(1);
  return result[0];
}

export async function updateUploadJob(id: string, data: Partial<InsertUploadJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(uploadJobs).set({ ...data, updatedAt: new Date() }).where(eq(uploadJobs.id, id));
}
