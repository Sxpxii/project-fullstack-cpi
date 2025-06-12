const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
  console.log("Incoming request:", req.path);
  next();
});

// Handle client-side routing, return React index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 5173;
const host = "0.0.0.0"
app.listen(PORT, host, (req,res) => {
    console.log(`Server is running on port http://${host}:${PORT}/`);
});
