const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const AppError = require('./utils/appError');

const app = express();

// 1. Security Headers Middleware (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Production-ready CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (
      config.NODE_ENV === 'development' ||
      config.CLIENT_URL === '*' ||
      config.ALLOWED_ORIGINS.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new AppError('Blocked by CORS policy', 403));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};

app.use(cors(corsOptions));

// 3. General API Rate Limiting Middleware
app.use('/api', apiLimiter);

// 4. Request Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Structured Request Logging
app.use(requestLogger());

// 6. Mount Resource API Routes
app.use('/api', routes);

// 7. Catch Unhandled 404 Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server.`, 404));
});

// 8. Centralized Error Handling Middleware
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  const startServer = async () => {
    try {
      if (config.MONGODB_URI) {
        await connectDB();
      } else {
        console.log(
          '[Server Notice] No MONGODB_URI provided. Starting without database connection (run dev:standalone for embedded DB).'
        );
      }

      const server = app.listen(config.PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 EventGrid Production API Server`);
        console.log(`📡 URL: http://localhost:${config.PORT}`);
        console.log(`🩺 Health: http://localhost:${config.PORT}/api/health`);
        console.log(`🏆 API Base: http://localhost:${config.PORT}/api/competitions`);
        console.log(`🌍 Environment: ${config.NODE_ENV}`);
        console.log(`======================================================\n`);
      });

      // Graceful shutdown handling
      const gracefulShutdown = (signal) => {
        console.log(`\n[Server] Received ${signal}. Gracefully terminating...`);
        server.close(async () => {
          const { disconnectDB } = require('./config/db');
          await disconnectDB().catch(() => {});
          console.log('[Server] Process terminated cleanly.');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
      console.error('[Server Fatal] Failed to start server:', error.message);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;
