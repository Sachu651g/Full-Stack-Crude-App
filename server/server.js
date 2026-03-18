// server.js — Entry point for the Express HTTP server
// Loads environment variables, imports the configured Express app, and starts listening.
// Keeping this file thin makes it easy to test app.js in isolation.

require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Expense Tracker API running on port ${PORT}`);
});
