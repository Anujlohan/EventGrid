const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/env');
const User = require('./models/User');
const Competition = require('./models/Competition');
const Registration = require('./models/Registration');

const startDevStandalone = async () => {
  console.log('[Standalone Dev] Initializing embedded MongoDB Replica Set for transactions...');
  
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uri = replSet.getUri();
  console.log(`[Standalone Dev] In-memory Replica Set running at: ${uri}`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('[Standalone Dev] Clean database ready for data-driven operation (zero fake data).');

  app.listen(config.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Competition API Server is running!`);
    console.log(`📡 URL: http://localhost:${config.PORT}`);
    console.log(`🩺 Health: http://localhost:${config.PORT}/api/health`);
    console.log(`🏆 Competitions API: http://localhost:${config.PORT}/api/competitions`);
    console.log(`======================================================\n`);
  });

  process.on('SIGINT', async () => {
    console.log('\n[Standalone Dev] Shutting down...');
    await mongoose.disconnect();
    await replSet.stop();
    process.exit(0);
  });
};

startDevStandalone().catch((err) => {
  console.error('[Standalone Dev Error] Failed to start:', err);
  process.exit(1);
});
