const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Init passport config
require('./config/passport');
const passport = require('passport');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// Trust first proxy (Render, Vercel, Nginx, etc.) for express-rate-limit and secure cookies
app.set('trust proxy', 1);

// Security: Hide X-Powered-By
app.disable('x-powered-by');

// Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  hidePoweredBy: true,
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
}));

// CORS
const allowedOrigins = [
  process.env.USER_FRONTEND_URL || 'http://localhost:5173',
  process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút' },
});
app.use('/api/', limiter);

// Dedicated Strict Rate Limiter for Authentication (Anti Brute-Force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: { success: false, message: 'Bạn đã thực hiện quá nhiều thao tác xác thực. Vui lòng thử lại sau 15 phút.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/admin-login', authLimiter);
app.use('/api/auth/change-password', authLimiter);
app.use('/api/auth/google-firebase', authLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Secure Static Uploads - prevent MIME sniffing and script execution
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'ignore',
  index: false,
}));

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Task Manager API', version: '1.0.0', description: 'API tài liệu cho ứng dụng Quản lý Nhiệm vụ' },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Task Manager API Docs' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server đang hoạt động', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint không tồn tại' }));

// Safe Global Error Handler (Prevents CWE-209 Information Leakage)
app.use((err, req, res, next) => {
  console.error('❌ Internal Server Error:', err);
  const status = err.status || (err.name === 'UnauthorizedError' ? 401 : 500);
  const message = status < 500 ? (err.message || 'Yêu cầu không hợp lệ') : 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';
  res.status(status).json({ success: false, message });
});

module.exports = app;
