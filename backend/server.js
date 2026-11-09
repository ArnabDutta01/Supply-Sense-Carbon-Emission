require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { apiKeyAuth } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const vendorRoutes = require('./routes/vendors');
const shipmentRoutes = require('./routes/shipments');
const emissionRoutes = require('./routes/emissions');

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors());

// HTTP request logger
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting: 100 requests per 15 minutes window
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});
app.use(limiter);

// Health check endpoint (public, unauthenticated)
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SupplySense Carbon Tracking REST API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API Key Authentication middleware (protects all /api endpoints)
app.use('/api', apiKeyAuth);

// Resource routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/emissions', emissionRoutes);

// Catch-all 404 handler for unknown endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' not found on SupplySense API`
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server after connecting to database
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[SupplySense Backend] Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful shutdown listeners
    const handleShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down HTTP server...`);
      server.close(() => {
        console.log('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = app;
