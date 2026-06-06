const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'qr-data.txt');
const outFile  = path.join(__dirname, 'qr.png');

const qrData = fs.readFileSync(dataFile, 'utf8').trim();

QRCode.toFile(outFile, qrData, { width: 400, margin: 2 }, (err) => {
  if (err) { console.error('ERROR:', err); process.exit(1); }
  console.log('DONE:' + outFile);
});
