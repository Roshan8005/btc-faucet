require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

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

// JSON file-based database
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files
function initDataFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(USERS_FILE, { users: {} });
initDataFile(PAYMENTS_FILE, { payments: [] });
initDataFile(ADS_FILE, { ads: [] });

// Database helper functions
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

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
  const adsData = readJSON(ADS_FILE);
  const activeAds = adsData.ads.filter(ad => ad.active !== false);
  const ad = activeAds.length > 0 ? activeAds[Math.floor(Math.random() * activeAds.length)] : null;
  
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
  
  // Read users data
  const usersData = readJSON(USERS_FILE);
  const user = usersData.users[ip];
  const currentTime = now();
  
  // Check cooldown
  if (user && (currentTime - user.last_claim) < COOLDOWN) {
    const waitTime = COOLDOWN - (currentTime - user.last_claim);
    return res.json({ message: `⏳ Please wait ${waitTime} seconds before next claim.` });
  }
  
  // Process payment
  const amountBtc = satoshiToBtc(REWARD_SAT);
  const paymentResult = await faucetpaySend(to, amountBtc);
  
  // Update user data
  if (user) {
    user.last_claim = currentTime;
    user.balance += REWARD_SAT;
    user.total_claims += 1;
  } else {
    usersData.users[ip] = {
      last_claim: currentTime,
      balance: REWARD_SAT,
      total_claims: 1
    };
  }
  writeJSON(USERS_FILE, usersData);
  
  // Log payment
  const paymentsData = readJSON(PAYMENTS_FILE);
  paymentsData.payments.push({
    id: paymentsData.payments.length + 1,
    time: currentTime,
    ip: ip,
    to_address: to,
    sat: REWARD_SAT,
    response: JSON.stringify(paymentResult)
  });
  writeJSON(PAYMENTS_FILE, paymentsData);
  
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
  const adsData = readJSON(ADS_FILE);
  adsData.ads.push({
    id: adsData.ads.length + 1,
    title: title,
    url: url,
    time: now(),
    active: true
  });
  writeJSON(ADS_FILE, adsData);
  
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
  
  const usersData = readJSON(USERS_FILE);
  const paymentsData = readJSON(PAYMENTS_FILE);
  const adsData = readJSON(ADS_FILE);
  
  const stats = {
    users: Object.keys(usersData.users).length,
    payments: paymentsData.payments.length,
    ads: adsData.ads.filter(ad => ad.active !== false).length,
    totalPaid: paymentsData.payments.reduce((sum, p) => sum + p.sat, 0)
  };
  
  const recentPayments = paymentsData.payments.slice(-10).reverse();
  const recentAds = adsData.ads.slice(-10).reverse();
  
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
  
  const adsData = readJSON(ADS_FILE);
  const adId = parseInt(req.params.id);
  const ad = adsData.ads.find(a => a.id === adId);
  
  if (ad) {
    ad.active = false;
    writeJSON(ADS_FILE, adsData);
    res.json({ message: 'Ad deleted successfully' });
  } else {
    res.status(404).json({ message: 'Ad not found' });
  }
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
