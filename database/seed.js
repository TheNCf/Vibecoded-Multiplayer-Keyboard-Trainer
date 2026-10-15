require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../server/database/config');
const { ensureSeedData } = require('./seedData');

// Resets the texts collection to exactly match database/defaultTexts.js:
// upserts every text and removes any text not present in the file.
// Set SEED_DEMO_USER=true to also (re)create the demo student.
async function seed() {
  const ok = await connectDB(process.env.DB_URI);
  if (!ok) {
    console.error('[seed] cannot connect to DB — check DB_URI in .env');
    process.exit(1);
  }

  await ensureSeedData({
    force: true,
    prune: true,
    withDemoUser: process.env.SEED_DEMO_USER === 'true'
  });

  await mongoose.disconnect();
  console.log('[seed] done');
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
