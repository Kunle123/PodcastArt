import { generateEpisodeArtwork } from './server/utils/artworkGenerator';

async function test() {
  try {
    console.log('Testing artwork generation...');
    
    const artworkUrl = await generateEpisodeArtwork({
      baseImageUrl: '/home/ubuntu/test-podcast-artwork.jpg',
      episodeNumber: '42',
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
    
    console.log('✅ Success! Artwork URL:', artworkUrl);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
