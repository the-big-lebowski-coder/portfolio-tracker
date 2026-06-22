const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const mySecret = process.env['FINNHUB_API_KEY'];

// Serve dashboard
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'portfolio-tracker.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading dashboard: ' + err.message);
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(data);
  });
});

// Health check
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Stock quote
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${req.params.ticker}&token=${FINNHUB_API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Company metrics
app.get('/api/metrics/:ticker', async (req, res) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/company-basic-financials?symbol=${req.params.ticker}&metric=all&token=${FINNHUB_API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));