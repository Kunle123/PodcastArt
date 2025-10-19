import { parseRssFeed } from './server/utils/rssParser';

async function testRssParsing() {
  try {
    console.log('Testing RSS feed parsing...');
    const feed = await parseRssFeed('https://audiofiction.co.uk/rss.xml');
    console.log('✅ RSS parsing successful!');
    console.log('Podcast Title:', feed.title);
    console.log('Episodes found:', feed.episodes.length);
    console.log('\nFirst episode:');
    console.log(JSON.stringify(feed.episodes[0], null, 2));
  } catch (error) {
    console.error('❌ RSS parsing failed:', error);
  }
}

testRssParsing();

