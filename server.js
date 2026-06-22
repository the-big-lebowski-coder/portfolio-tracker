const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.static('.')); // Serve static files
app.use(cors());

const FINNHUB_API_KEY = 'd8sejr9r01qkn75ea650d8sejr9r01qkn75ea65g';

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