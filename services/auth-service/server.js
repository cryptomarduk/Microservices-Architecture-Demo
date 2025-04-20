const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(morgan('combined'));
app.use(express.json());

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-auth-service-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// In-memory user database (for demo purposes)
// In production, you would use a real database
const users = [
  {
    id: '1',
    username: 'admin',
    password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LG1rS4CC.eP9oJ5nPYY09/hp6YfJuiO', // "admin123"
    roles: ['admin']
  },
  {
    id: '2',
    username: 'user',
    password: '$2a$10$XF47CfFN.JHx01WR4cRx3OYVUZsGS9Ry2s5xeEK9KQhT8cR3dC2PG', // "user123"
    roles: ['user']
  }
];

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        roles: user.roles 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      id: user.id,
      username: user.username,
      roles: user.roles,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    // Check if user already exists
    if (users.some(u => u.username === username)) {
      return res.status(409).json({ 
        error: 'Username already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: (users.length + 1).toString(),
      username,
      password: hashedPassword,
      roles: ['user']
    };
    
    // Add to in-memory database
    users.push(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        username: newUser.username,
        roles: newUser.roles
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      roles: newUser.roles,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation endpoint
app.post('/validate', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// User info endpoint
app.get('/user/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Return user info without password
  const { password, ...userInfo } = user;
  res.json(userInfo);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Auth Service is healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth Service running on http://localhost:${PORT}`);
});
