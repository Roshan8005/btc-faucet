require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'lightbringer_faucet.db'));

// Configuration
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.FAUCETPAY_API_KEY || '';
const EMAIL = process.env.FAUCET_EMAIL || '';
const CURRENCY = process.env.CURRENCY || 'BTC';
const REWARD_SAT = Number(process.env.FAUCET_REWARD_SAT || 5);
const PROMO_COST_SAT = Number(process.env.PROMO_COST_SAT || 2.5);
const COOLDOWN = Number(process.env.COOLDOWN || 300); // 5 minutes
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || '';
const ADSENSE_SLOT = process.env.ADSENSE_SLOT || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-key';

// Database setup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    ip TEXT PRIMARY KEY,
    last_claim INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    total_claims INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time INTEGER,
    ip TEXT,
    to_address TEXT,
    sat INTEGER,
    response TEXT
  );
  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    url TEXT,
    time INTEGER,
    active INTEGER DEFAULT 1
  );
`);

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(rateLimit({ 
  windowMs: 60 * 1000, 
  max: 100,
  message: 'Too many requests, please try again later.'
}));

// Helper functions
const now = () => Math.floor(Date.now() / 1000);
const getIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
const satoshiToBtc = (sat) => (sat * 1e-8).toFixed(8);

// FaucetPay API
async function faucetpaySend(to, amountBtc) {
  const url = 'https://faucetpay.io/api/v1/send';
  const params = new URLSearchParams();
  params.append('api_key', API_KEY);
  params.append('currency', CURRENCY);
  params.append('to', to);
  params.append('amount', amountBtc);
  
  try {
    const response = await fetch(url, { 
      method: 'POST', 
      body: params,
      timeout: 15000 
    });
    return await response.json();
  } catch (error) {
    return { status: false, error: error.message };
  }
}

// Routes
app.get('/', (req, res) => {
  // Get random ad
  const ads = db.prepare('SELECT * FROM ads WHERE active = 1 ORDER BY RANDOM() LIMIT 1').all();
  const ad = ads.length > 0 ? ads[0] : null;
  
  res.render('index', {
    ad,
    adsenseClient: ADSENSE_CLIENT,
    adsenseSlot: ADSENSE_SLOT,
    rewardSat: REWARD_SAT,
    cooldownMin: Math.floor(COOLDOWN / 60)
  });
});

app.post('/claim', async (req, res) => {
  const ip = getIp(req);
  const to = (req.body.fp_to || '').trim();
  
  if (!to) {
    return res.json({ message: '❌ Please enter your FaucetPay username or wallet address.' });
  }
  
  // Check user cooldown
  const user = db.prepare('SELECT * FROM users WHERE ip = ?').get(ip);
  const currentTime = now();
  
  if (user && (currentTime - user.last_claim) < COOLDOWN) {
    const waitTime = COOLDOWN - (currentTime - user.last_claim);
    return res.json({ message: `⏳ Please wait ${waitTime} seconds before next claim.` });
  }
  
  // Process payment
  const amountBtc = satoshiToBtc(REWARD_SAT);
  const paymentResult = await faucetpaySend(to, amountBtc);
  
  // Update database
  if (user) {
    db.prepare('UPDATE users SET last_claim = ?, balance = balance + ?, total_claims = total_claims + 1 WHERE ip = ?')
      .run(currentTime, REWARD_SAT, ip);
  } else {
    db.prepare('INSERT INTO users (ip, last_claim, balance, total_claims) VALUES (?, ?, ?, 1)')
      .run(ip, currentTime, REWARD_SAT);
  }
  
  // Log payment
  db.prepare('INSERT INTO payments (time, ip, to_address, sat, response) VALUES (?, ?, ?, ?, ?)')
    .run(currentTime, ip, to, REWARD_SAT, JSON.stringify(paymentResult));
  
  if (paymentResult.status === true || paymentResult.status === 'success') {
    return res.json({ message: `✅ Successfully sent ${REWARD_SAT} satoshi to ${to}!` });
  } else {
    return res.json({ message: `❌ Payment failed: ${paymentResult.message || 'Unknown error'}` });
  }
});

app.get('/promote', (req, res) => {
  res.render('promote', {
    promoCost: PROMO_COST_SAT
  });
});

app.post('/promote', (req, res) => {
  const { title, url } = req.body;
  
  if (!title || !url) {
    return res.json({ message: '❌ All fields are required.' });
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.json({ message: '❌ Invalid URL format.' });
  }
  
  // Insert ad
  db.prepare('INSERT INTO ads (title, url, time) VALUES (?, ?, ?)')
    .run(title, url, now());
  
  res.json({ message: `✅ Ad submitted successfully: ${title}` });
});

// Admin routes
app.get('/admin', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: req.query.error });
});

app.post('/admin', (req, res) => {
  const { user, pass } = req.body;
  
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.admin = true;
    return res.redirect('/dashboard');
  }
  
  res.redirect('/admin?error=1');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    payments: db.prepare('SELECT COUNT(*) as count FROM payments').get().count,
    ads: db.prepare('SELECT COUNT(*) as count FROM ads WHERE active = 1').get().count,
    totalPaid: db.prepare('SELECT SUM(sat) as total FROM payments').get().total || 0
  };
  
  const recentPayments = db.prepare('SELECT * FROM payments ORDER BY id DESC LIMIT 10').all();
  const recentAds = db.prepare('SELECT * FROM ads ORDER BY id DESC LIMIT 10').all();
  
  res.render('dashboard', {
    stats,
    recentPayments,
    recentAds
  });
});

app.post('/admin/delete-ad/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  db.prepare('UPDATE ads SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ad deleted successfully' });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🌐 ═══════════════════════════════════════════════════');
  console.log('💧 Lightbringer Faucet Server Started');
  console.log('🌐 ═══════════════════════════════════════════════════');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`📍 Network:  http://0.0.0.0:${PORT}`);
  console.log('🌐 ═══════════════════════════════════════════════════');
  console.log(`💰 Reward:   ${REWARD_SAT} satoshi per claim`);
  console.log(`⏱️  Cooldown: ${Math.floor(COOLDOWN / 60)} minutes`);
  console.log('🌐 ═══════════════════════════════════════════════════');
});
