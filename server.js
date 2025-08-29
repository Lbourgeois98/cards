const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const WERT_CONFIG = {
  API_KEY: '776572742d70726f642d33343733656162352d653566312d343363352d626535312d616531336165643361643539',
  PARTNER_ID: '01K1T8VJJ8TY67M49FDXY865GF',
  WALLET_ADDRESS: '39zC2iwMf6qzmVVEcBdfXG6WpVn84Mwxzv',
  API_URL: 'https://partner.wert.io/api/external/hpp/create-session'
};

app.post('/api/create-session', async (req, res) => {
  try {
    const { currency_amount = 100 } = req.body;
    
    const sessionData = {
      flow_type: 'simple_full_restrict',
      wallet_address: WERT_CONFIG.WALLET_ADDRESS,
      currency: 'USD',
      commodity: 'BTC',
      network: 'bitcoin',
      currency_amount: parseFloat(currency_amount)
    };

    const response = await fetch(WERT_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': WERT_CONFIG.API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    res.json({ success: true, sessionId: result.sessionId });

  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
