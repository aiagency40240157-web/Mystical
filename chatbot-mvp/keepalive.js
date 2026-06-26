require('dotenv').config();
const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';

function ping() {
  const url = new URL(BACKEND_URL);
  if (url.protocol !== 'https:') return;
  const req = https.request({ hostname: url.hostname, path: '/health', method: 'GET', timeout: 10000 }, res => {
    console.log(`[keepalive] ${new Date().toISOString()} — ${res.statusCode}`);
  });
  req.on('error', () => {
    console.log(`[keepalive] ${new Date().toISOString()} — ping sent (backend waking up)`);
  });
  req.end();
}

ping();
setInterval(ping, 10 * 60 * 1000); // cada 10 minutos
