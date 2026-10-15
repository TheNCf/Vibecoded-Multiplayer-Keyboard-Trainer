const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    console.warn('[db] DB_URI is not set — running without database (history and archive disabled)');
    return false;
  }

  // Retry: in Docker the DB may still be booting when the server starts.
  const attempts = Number(process.env.DB_CONNECT_RETRIES) || 5;
  const delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS) || 2000;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('[db] connected to MongoDB');
      return true;
    } catch (err) {
      console.error(`[db] connection attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.warn('[db] server continues without database');
  return false;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected };
