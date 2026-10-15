const Text = require('../server/models/Text');
const User = require('../server/models/User');
const defaultTexts = require('./defaultTexts');

const DEMO_USER = { alias: 'Тест', code: '1234' };

// Fills texts (and optionally the demo student).
// Used both by `npm run seed` (force/prune, resets DB to the file) and by the
// server on startup (non-destructive: only seeds an empty collection).
async function ensureSeedData({ force = false, prune = false, withDemoUser = false } = {}) {
  const count = await Text.estimatedDocumentCount();
  let textsUpserted = 0;

  if (force || count === 0) {
    for (const t of defaultTexts) {
      await Text.updateOne({ title: t.title }, { $set: t }, { upsert: true });
      textsUpserted += 1;
    }
    console.log(`[seed] texts upserted: ${textsUpserted}`);
  } else {
    console.log('[seed] texts already present — skipping');
  }

  let textsRemoved = 0;
  if (prune) {
    const titles = defaultTexts.map((t) => t.title);
    const res = await Text.deleteMany({ title: { $nin: titles } });
    textsRemoved = res.deletedCount || 0;
    console.log(`[seed] texts removed (not in defaultTexts.js): ${textsRemoved}`);
  }

  let demoUserCreated = false;
  if (withDemoUser) {
    const res = await User.updateOne({ alias: DEMO_USER.alias }, { $set: DEMO_USER }, { upsert: true });
    demoUserCreated = res.upsertedCount > 0;
    console.log(
      `[seed] demo student ${demoUserCreated ? 'created' : 'already exists'}: alias="${DEMO_USER.alias}" code="${DEMO_USER.code}"`
    );
  }

  return { textsUpserted, textsRemoved, demoUserCreated };
}

module.exports = { ensureSeedData, DEMO_USER };
