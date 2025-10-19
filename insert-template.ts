import { drizzle } from 'drizzle-orm/mysql2';
import { nanoid } from 'nanoid';

const db = drizzle(process.env.DATABASE_URL!);

async function insertTemplate() {
  const template = {
    id: nanoid(),
    projectId: 'RT8M7Or6r-SIOLKesSYed',
    name: 'Default Template',
    baseArtworkUrl: 'file:///home/ubuntu/test-podcast-artwork.jpg',
    showEpisodeNumber: 'true',
    episodeNumberPosition: 'top-right',
    episodeNumberFont: 'Arial',
    episodeNumberSize: '120',
    episodeNumberColor: '#FFFFFF',
    episodeNumberBgColor: '#000000',
    episodeNumberBgOpacity: '0.8',
    showNavigation: 'true',
    navigationPosition: 'bottom-center',
    navigationStyle: 'arrows',
    isActive: 'true',
  };

  await db.execute(`
    INSERT INTO templates (
      id, projectId, name, baseArtworkUrl, showEpisodeNumber,
      episodeNumberPosition, episodeNumberFont, episodeNumberSize,
      episodeNumberColor, episodeNumberBgColor, episodeNumberBgOpacity,
      showNavigation, navigationPosition, navigationStyle, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    template.id, template.projectId, template.name, template.baseArtworkUrl,
    template.showEpisodeNumber, template.episodeNumberPosition, template.episodeNumberFont,
    template.episodeNumberSize, template.episodeNumberColor, template.episodeNumberBgColor,
    template.episodeNumberBgOpacity, template.showNavigation, template.navigationPosition,
    template.navigationStyle, template.isActive
  ]);

  console.log('✅ Template inserted successfully!');
}

insertTemplate().catch(console.error);
