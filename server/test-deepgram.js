// Narrowing down which parameter causes the 400
import WebSocket from 'ws';

const API_KEY = process.env.DEEPGRAM_KEY || process.argv[2];
if (!API_KEY) {
  console.error('Usage: node test-deepgram.js <YOUR_DEEPGRAM_API_KEY>');
  process.exit(1);
}

const BASE = 'wss://api.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=16000&language=en&punctuate=true&interim_results=true';

const tests = [
  { label: 'base only', url: BASE },
  { label: '+ endpointing=150', url: BASE + '&endpointing=150' },
  { label: '+ vad_events=true', url: BASE + '&vad_events=true' },
  { label: '+ utterance_end_ms=700', url: BASE + '&utterance_end_ms=700' },
  { label: '+ endpointing + vad_events', url: BASE + '&endpointing=150&vad_events=true' },
  { label: '+ endpointing + utterance_end_ms', url: BASE + '&endpointing=150&utterance_end_ms=700' },
  { label: '+ vad_events + utterance_end_ms', url: BASE + '&vad_events=true&utterance_end_ms=700' },
  { label: 'all three', url: BASE + '&endpointing=150&vad_events=true&utterance_end_ms=700' },
];

async function testConnection(url, label) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, ['token', API_KEY], {
      headers: { Authorization: `Token ${API_KEY}` },
    });

    const timeout = setTimeout(() => {
      ws.close();
      resolve('timeout');
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`  ✓ ${label}`);
      ws.close();
      resolve('ok');
    });

    ws.on('unexpected-response', (req, res) => {
      clearTimeout(timeout);
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`  ✗ ${label} → HTTP ${res.statusCode}`);
        resolve(`error-${res.statusCode}`);
      });
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`  ✗ ${label} → ${err.message}`);
      resolve('error');
    });
  });
}

console.log('Testing Deepgram parameter combinations...\n');

for (const test of tests) {
  await testConnection(test.url, test.label);
}

console.log('\nDone.');
process.exit(0);
