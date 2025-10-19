/**
 * Utility functions for auto-assigning episode numbers
 */

interface Episode {
  id: string;
  title: string;
  episodeNumber: string | null;
  publishedAt: Date | null;
}

/**
 * Auto-assign episode numbers based on publish date (oldest = 1, newest = N)
 */
export function autoAssignEpisodeNumbers(episodes: Episode[]): Map<string, string> {
  const assignments = new Map<string, string>();
  
  // Sort by publish date (oldest first)
  const sorted = [...episodes].sort((a, b) => {
    if (!a.publishedAt || !b.publishedAt) return 0;
    return a.publishedAt.getTime() - b.publishedAt.getTime();
  });
  
  // Assign sequential numbers
  sorted.forEach((episode, index) => {
    if (!episode.episodeNumber) {
      assignments.set(episode.id, String(index + 1));
    }
  });
  
  return assignments;
}

/**
 * Try to extract episode number from title
 * Patterns: "Episode 5", "Ep. 5", "E5", "#5", "005"
 */
export function extractEpisodeNumberFromTitle(title: string): string | null {
  // Pattern 1: "Episode 5" or "Ep. 5" or "Ep 5"
  let match = title.match(/(?:episode|ep\.?)\s*(\d+)/i);
  if (match) return match[1];
  
  // Pattern 2: "E5" or "E05"
  match = title.match(/\bE(\d+)\b/i);
  if (match) return String(parseInt(match[1]));
  
  // Pattern 3: "#5" or "# 5"
  match = title.match(/#\s*(\d+)/);
  if (match) return match[1];
  
  // Pattern 4: Leading number "005 - Title" or "5. Title"
  match = title.match(/^(\d+)[\s\.\-:]/);
  if (match) return String(parseInt(match[1]));
  
  return null;
}

/**
 * Smart episode numbering: try title extraction first, then fall back to date-based
 */
export function smartAssignEpisodeNumbers(episodes: Episode[]): Map<string, string> {
  const assignments = new Map<string, string>();
  
  // First pass: try to extract from titles
  episodes.forEach(episode => {
    if (!episode.episodeNumber) {
      const extracted = extractEpisodeNumberFromTitle(episode.title);
      if (extracted) {
        assignments.set(episode.id, extracted);
      }
    }
  });
  
  // Second pass: for remaining episodes without numbers, use date-based assignment
  const unnumbered = episodes.filter(ep => 
    !ep.episodeNumber && !assignments.has(ep.id)
  );
  
  if (unnumbered.length > 0) {
    const dateBasedAssignments = autoAssignEpisodeNumbers(unnumbered);
    dateBasedAssignments.forEach((number, id) => {
      assignments.set(id, number);
    });
  }
  
  return assignments;
}

