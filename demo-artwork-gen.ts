import { generateEpisodeArtwork } from './server/utils/artworkGenerator';

const episodes = [
  { number: '1', title: 'The Call of Cthulhu Mystery Program' },
  { number: '42', title: 'Test Episode' },
  { number: '108', title: 'Camlann - An Audio Drama' },
  { number: '215', title: 'HAVANA SYNDROME' },
  { number: '316', title: 'Gabriel: Born' },
];

async function generateDemo() {
  console.log('🎨 Generating artwork for 5 episodes...\n');
  
  for (const ep of episodes) {
    try {
      console.log(`Generating Episode ${ep.number}: ${ep.title}...`);
      
      const artworkUrl = await generateEpisodeArtwork({
        baseImageUrl: '/home/ubuntu/test-podcast-artwork.jpg',
        episodeNumber: ep.number,
        numberPosition: 'top-right',
        fontSize: 120,
        fontColor: '#FFFFFF',
        fontFamily: 'Arial',
        backgroundColor: '#000000',
        backgroundOpacity: 0.8,
        showNavigation: true,
        navigationPosition: 'bottom-center',
        navigationStyle: 'arrows',
      });
      
      console.log(`✅ Episode ${ep.number}: ${artworkUrl}\n`);
    } catch (error) {
      console.error(`❌ Episode ${ep.number}: Error -`, error);
    }
  }
  
  console.log('🎉 Demo complete!');
}

generateDemo();
