// Node script to generate firebase-config.js from environment variables
const fs = require('fs');
const path = require('path');

const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars for firebase config:', missing.join(', '));
  process.exit(1);
}

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

if (process.env.FIREBASE_MEASUREMENT_ID) {
  config.measurementId = process.env.FIREBASE_MEASUREMENT_ID;
}

const out = 'window.FIREBASE_CONFIG = ' + JSON.stringify(config, null, 2) + ' ;\n';
fs.writeFileSync(path.join(process.cwd(), 'firebase-config.js'), out, { encoding: 'utf8' });
console.log('Wrote firebase-config.js');
