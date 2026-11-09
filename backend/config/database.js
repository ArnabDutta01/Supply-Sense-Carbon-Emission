const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance using Mongoose.
 * Reads MONGODB_URI from environment variables, falling back to local default.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplysense';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // Exit process with failure code if unable to establish database connection
    process.exit(1);
  }
};

module.exports = connectDB;
