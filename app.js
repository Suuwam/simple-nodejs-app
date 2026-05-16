const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

app.get('/', (req, res) => res.json({
  message: 'Hello from Node.js on AWS ECS!',
  timestamp: new Date().toISOString()
}));

app.get('/about', (req, res) => res.json({
  app: 'simple-nodejs-app',
  author: 'Shuvam'
}));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
