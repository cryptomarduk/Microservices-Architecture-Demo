const express = require('express');
const morgan = require('morgan');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(morgan('combined'));
app.use(express.json());

// In-memory product database (for demo purposes)
// In production, you would use a real database
const products = [
  {
    id: '1',
    name: 'Smartphone',
    description: 'Latest model smartphone with high-resolution camera',
    price: 799.99,
    category: 'Electronics',
    inStock: 50
  },
  {
    id: '2',
    name: 'Laptop',
    description: 'Powerful laptop with fast processor and high memory',
    price: 1299.99,
    category: 'Electronics',
    inStock: 30
  },
  {
    id: '3',
    name: 'Headphones',
    description: 'Wireless noise-canceling headphones',
    price: 199.99,
    category: 'Electronics',
    inStock: 100
  },
  {
    id: '4',
    name: 'Smartwatch',
    description: 'Fitness tracker and smart notifications on your wrist',
    price: 249.99,
    category: 'Electronics',
    inStock: 45
  },
  {
    id: '5',
    name: 'Bluetooth Speaker',
    description: 'Portable speaker with excellent sound quality',
    price: 89.99,
    category: 'Electronics',
    inStock: 75
  }
];

// Get all products
app.get('/', (req, res) => {
  // Check for category filter
  const categoryFilter = req.query.category;
  
  if (categoryFilter) {
    const filteredProducts = products.filter(product => 
      product.category.toLowerCase() === categoryFilter.toLowerCase()
    );
    return res.json(filteredProducts);
  }
  
  res.json(products);
});

// Get product by ID
app.get('/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
});

// Create new product
app.post('/', (req, res) => {
  // In a real application, validate the request body
  const { name, description, price, category, inStock } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ 
      error: 'Name, price, and category are required' 
    });
  }
  
  const newProduct = {
    id: (products.length + 1).toString(),
    name,
    description: description || '',
    price: parseFloat(price),
    category,
    inStock: inStock || 0
  };
  
  products.push(newProduct);
  
  res.status(201).json(newProduct);
});

// Update product
app.put('/:id', (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const { name, description, price, category, inStock } = req.body;
  const updatedProduct = {
    ...products[productIndex],
    name: name || products[productIndex].name,
    description: description || products[productIndex].description,
    price: price ? parseFloat(price) : products[productIndex].price,
    category: category || products[productIndex].category,
    inStock: inStock !== undefined ? inStock : products[productIndex].inStock
  };
  
  products[productIndex] = updatedProduct;
  
  res.json(updatedProduct);
});

// Delete product
app.delete('/:id', (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  
  res.json(deletedProduct);
});

// Check stock
app.get('/:id/stock', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json({
    id: product.id,
    name: product.name,
    inStock: product.inStock,
    available: product.inStock > 0
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Product Service is healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on http://localhost:${PORT}`);
});
