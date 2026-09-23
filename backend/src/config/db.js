const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async (uri = config.MONGODB_URI) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const targetUri = uri || config.MONGODB_URI;

  if (!targetUri && config.NODE_ENV !== 'test') {
    throw new Error(
      'MONGODB_URI configuration error: Connection string is required for production and standard development.\n' +
      'Please configure MONGODB_URI pointing to your MongoDB Atlas cluster or local replica set.'
    );
  }

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 7000,
      socketTimeoutMS: 45000,
      maxPoolSize: 25,
      minPoolSize: 2,
    });

    isConnected = true;
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
    console.log(`[Database] Target Database: ${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database Fatal] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB connection closed.');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
