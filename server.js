const express = require('express');
const path = require('path');
const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from the React build
const buildPath = path.join(__dirname, 'build');
console.log('Serving static files from:', buildPath);
app.use(express.static(buildPath));

// Handle React routing, return all requests to React app
app.get('*', function(req, res) {
  const indexPath = path.join(buildPath, 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server started at ${new Date().toISOString()}`);
  console.log(`Server listening on port ${port}`);
  console.log('Current directory:', __dirname);
  console.log('Build directory exists:', require('fs').existsSync(buildPath));
});
