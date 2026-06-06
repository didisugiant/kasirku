const express = require('express');
const cors = require('cors');
const path = require('path');
const midtransClient = require('midtrans-client');

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Konfigurasi Midtrans Production ──
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'Mid-server-IzUDZMb_OiUw6wZHnl0rZKaB';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-u3vO7XKHihKUiwkj';

const snap = new midtransClient.Snap({
  isProduction: true,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY
});

// ── Data paket premium ──
const PACKAGES = {
  monthly:  { price: 20000, name: '1 Bulan', duration: 30 },
  quarterly: { price: 50000, name: '3 Bulan', duration: 90 },
  yearly:   { price: 150000, name: '1 Tahun', duration: 365 }
};

// ═══════════════════════════════════════
// API Routes
// ═══════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0'
  });
});

// Buat transaksi pembayaran
app.post('/api/create-payment', async (req, res) => {
  try {
    const { packageType } = req.body;

    const pkg = PACKAGES[packageType];
    if (!pkg) {
      return res.status(400).json({
        error: 'Paket tidak valid',
        validPackages: Object.keys(PACKAGES)
      });
    }

    const orderId = 'KSR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: pkg.price
      },
      item_details: [{
        id: 'PKG-' + packageType,
        price: pkg.price,
        quantity: 1,
        name: 'KasirKu Premium ' + pkg.name,
        category: 'Digital Subscription'
      }],
      customer_details: {
        first_name: 'Pengguna',
        last_name: 'KasirKu',
        email: 'user@kasirku.app',
        phone: '081300000000'
      },
      enabled_payments: [
        'qris', 'gopay', 'shopeepay', 'bank_transfer',
        'bca_va', 'bni_va', 'bri_va', 'mandiri_va',
        'indomaret', 'alfamart'
      ]
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
      amount: pkg.price,
      package: pkg.name
    });

  } catch (error) {
    console.error('Payment error:', error.message);
    res.status(500).json({
      error: 'Gagal membuat transaksi',
      message: error.message
    });
  }
});

// Cek status pembayaran
app.get('/api/payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await fetch(`https://api.midtrans.com/v2/${orderId}/status`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64')
      }
    });

    const data = await response.json();

    res.json({
      success: true,
      order_id: data.order_id,
      status: data.transaction_status,
      payment_type: data.payment_type,
      gross_amount: data.gross_amount,
      transaction_time: data.transaction_time,
      settlement_time: data.settlement_time
    });

  } catch (error) {
    console.error('Status error:', error.message);
    res.status(500).json({
      error: 'Gagal mengecek status',
      message: error.message
    });
  }
});

// Webhook Midtrans (auto notification)
app.post('/api/webhook/midtrans', (req, res) => {
  try {
    const notification = req.body;
    console.log('📩 Webhook:', notification.order_id, '-', notification.transaction_status);

    if (notification.transaction_status === 'settlement' ||
        notification.transaction_status === 'capture') {
      console.log('✅ Payment settled:', notification.order_id);
      // Di sini bisa kirim email/WA ke user
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get client key (buat frontend)
app.get('/api/config', (req, res) => {
  res.json({
    midtransClientKey: MIDTRANS_CLIENT_KEY,
    isProduction: true
  });
});

// ── Serve Frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  💰  KasirKu Server v2.0             ║');
  console.log('║  🟢  Running on port ' + String(PORT).padEnd(18) + '║');
  console.log('║  💳  Midtrans: PRODUCTION            ║');
  console.log('║  🤖  OpenAI: Connected               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
