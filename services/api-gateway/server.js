const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());   // CORS handling
app.use(morgan('combined')); // Logging
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// JWT Verification middleware
const verifyToken = (req, res, next) => {
  // Skip token verification for login/register endpoints
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Apply JWT verification to all routes
app.use(verifyToken);

// Service discovery (using environment variables or hard-coded values for demo)
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';

// Proxy middleware options
const options = {
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/',
    '^/api/products': '/',
    '^/api/orders': '/'
  }
};

// Proxy routes
app.use('/api/auth', createProxyMiddleware({
  ...options,
  target: AUTH_SERVICE,
  onProxyReq: (proxyReq, req, res) => {
    // Log the forwarded request
    console.log(`Forwarding request to Auth Service: ${req.method} ${req.path}`);
  }
}));

app.use('/api/products', createProxyMiddleware({
  ...options,
  target: PRODUCT_SERVICE,
  onProxyReq: (proxyReq, req, res) => {
    // Add user ID from JWT for personalization if needed
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    console.log(`Forwarding request to Product Service: ${req.method} ${req.path}`);
  }
}));

app.use('/api/orders', createProxyMiddleware({
  ...options, 
  target: ORDER_SERVICE,
  onProxyReq: (proxyReq, req, res) => {
    // Add user ID from JWT for order association
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
    console.log(`Forwarding request to Order Service: ${req.method} ${req.path}`);
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API Gateway is healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Routing to Auth Service: ${AUTH_SERVICE}`);
  console.log(`Routing to Product Service: ${PRODUCT_SERVICE}`);
  console.log(`Routing to Order Service: ${ORDER_SERVICE}`);
});
