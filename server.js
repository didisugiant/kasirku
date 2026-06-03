const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Konfigurasi Midtrans
const snap = new midtransClient.Snap({
  isProduction: true, // PRODUCTION (uang asli)
  serverKey: 'Mid-server-IzUDZMb_OiUw6wZHnl0rZKaB',
  clientKey: 'Mid-client-u3vO7XKHihKUiwkj'
});

// Endpoint untuk membuat transaksi
app.post('/api/create-payment', async (req, res) => {
  try {
    const { packageType } = req.body;
    
    const packages = {
      monthly:  { price: 20000, name: '1 Bulan' },
      quarterly: { price: 50000, name: '3 Bulan' },
      yearly:   { price: 150000, name: '1 Tahun' }
    };
    
    const pkg = packages[packageType];
    if (!pkg) return res.status(400).json({ error: 'Paket tidak valid' });
    
    const orderId = 'KSR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: pkg.price
      },
      item_details: [{
        id: 'KSR-' + packageType,
        price: pkg.price,
        quantity: 1,
        name: 'KasirKu Premium ' + pkg.name
      }],
      credit_card: { secure: true },
      enabled_payments: [
        'qris', 'gopay', 'shopeepay', 'bank_transfer',
        'bca_va', 'bni_va', 'bri_va', 'mandiri_va',
        'indomaret', 'alfamart', 'akulaku', 'kredivo'
      ]
    };
    
    const transaction = await snap.createTransaction(parameter);
    
    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    });
    
  } catch (error) {
    console.error('Midtrans error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint cek status pembayaran
app.get('/api/payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const response = await fetch(`https://api.midtrans.com/v2/${orderId}/status`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('Mid-server-IzUDZMb_OiUw6wZHnl0rZKaB' + ':').toString('base64')
      }
    });
    
    const data = await response.json();
    
    res.json({
      status: data.transaction_status,
      payment_type: data.payment_type,
      gross_amount: data.gross_amount,
      order_id: data.order_id
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});
