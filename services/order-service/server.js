const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Service discovery (using environment variables or hard-coded values for demo)
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

// Middleware
app.use(morgan('combined'));
app.use(express.json());

// In-memory order database (for demo purposes)
// In production, you would use a real database
const orders = [
  {
    id: '1',
    userId: '2',
    products: [
      { id: '1', quantity: 2, price: 799.99 },
      { id: '3', quantity: 1, price: 199.99 }
    ],
    total: 1799.97,
    status: 'completed',
    createdAt: '2023-03-15T10:30:00Z'
  },
  {
    id: '2',
    userId: '2',
    products: [
      { id: '2', quantity: 1, price: 1299.99 }
    ],
    total: 1299.99,
    status: 'shipped',
    createdAt: '2023-03-20T14:20:00Z'
  }
];

// Helper function to check product availability
const checkProductAvailability = async (productId, quantity) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE}/${productId}/stock`);
    const { inStock } = response.data;
    return inStock >= quantity;
  } catch (error) {
    console.error(`Error checking product ${productId} availability:`, error.message);
    return false;
  }
};

// Helper function to get product details
const getProductDetails = async (productId) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE}/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product ${productId} details:`, error.message);
    throw new Error(`Product ${productId} not found`);
  }
};

// Get all orders for a user
app.get('/', (req, res) => {
  // Get user ID from the request header (set by API Gateway)
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const userOrders = orders.filter(order => order.userId === userId);
  
  res.json(userOrders);
});

// Get order by ID
app.get('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Ensure user can only access their own orders
  if (order.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(order);
});

// Create new order
app.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        error: 'Products array is required and cannot be empty' 
      });
    }
    
    // Validate products and check availability
    const orderProducts = [];
    let total = 0;
    
    for (const item of products) {
      if (!item.id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ 
          error: 'Each product must have a valid ID and positive quantity' 
        });
      }
      
      // Check if product exists and is available
      const isAvailable = await checkProductAvailability(item.id, item.quantity);
      
      if (!isAvailable) {
        return res.status(400).json({ 
          error: `Product ${item.id} is not available in the requested quantity` 
        });
      }
      
      // Get product details
      const product = await getProductDetails(item.id);
      
      // Add to order products
      orderProducts.push({
        id: item.id,
        quantity: item.quantity,
        price: product.price
      });
      
      // Update total
      total += product.price * item.quantity;
    }
    
    // Create new order
    const newOrder = {
      id: uuidv4(),
      userId,
      products: orderProducts,
      total: parseFloat(total.toFixed(2)),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Add to database
    orders.push(newOrder);
    
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
app.patch('/:id/status', (req, res) => {
  const userId = req.headers['x-user-id'];
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Ensure user can only update their own orders
  if (orders[orderIndex].userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  // Validate status
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: `Status must be one of: ${validStatuses.join(', ')}` 
    });
  }
  
  // Update order
  orders[orderIndex].status = status;
  
  res.json(orders[orderIndex]);
});

// Cancel order
app.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Ensure user can only cancel their own orders
  if (orders[orderIndex].userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if order can be cancelled
  const order = orders[orderIndex];
  
  if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({ 
      error: 'Cannot cancel order that has been shipped or delivered' 
    });
  }
  
  // Update status to cancelled
  order.status = 'cancelled';
  
  res.json(order);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Order Service is healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Order Service running on http://localhost:${PORT}`);
  console.log(`Connected to Product Service at: ${PRODUCT_SERVICE}`);
});
