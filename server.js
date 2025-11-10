require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'faucet.db'));

const PORT = process.env.PORT || 10000;
const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY || '';
const WALLET_USERNAME = process.env.WALLET_USERNAME || 'roshan1998';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || 'REPLACE_ME';
const RECAPTCHA_SITEKEY = process.env.RECAPTCHA_SITEKEY || 'REPLACE_ME';
const FAUCET_PAYOUT_SATS = Number(process.env.FAUCET_PAYOUT_SATS || 2);
const CLAIM_COOLDOWN_MIN = Number(process.env.CLAIM_COOLDOWN_MIN || 60);
const MAX_IP_PER_DAY = Number(process.env.MAX_IP_PER_DAY || 20);
const ADMIN_PASS = process.env.ADMIN_PASS || 'demo123';
const SITE_TITLE = process.env.SITE_TITLE || 'Roshan Faucet';

db.exec(`
CREATE TABLE IF NOT EXISTS users (wallet TEXT PRIMARY KEY, last_claim_ts INTEGER DEFAULT 0, total_claims INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS claims (id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, ip TEXT, amount_sats INTEGER, ts INTEGER);
CREATE TABLE IF NOT EXISTS payouts (id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, amount_sats INTEGER, status TEXT, txid TEXT, created_ts INTEGER);
`);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

const now = () => Math.floor(Date.now() / 1000);
const getIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0];

async function verifyCaptcha(token, ip) {
  const params = new URLSearchParams();
  params.append('secret', RECAPTCHA_SECRET);
  params.append('response', token);
  params.append('remoteip', ip);
  const r = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params });
  return await r.json();
}

async function faucetpaySend(wallet, sats) {
  const btc = (sats / 1e8).toFixed(8);
  const p = new URLSearchParams();
  p.append('api_key', FAUCETPAY_API_KEY);
  p.append('to', wallet);
  p.append('amount', btc);
  p.append('currency', 'BTC');
  const r = await fetch('https://faucetpay.io/api/v1/send', { method: 'POST', body: p });
  return await r.json();
}

function ipClaimsToday(ip) {
  const start = Math.floor(new Date().setHours(0,0,0,0) / 1000);
  const row = db.prepare('SELECT COUNT(*) as c FROM claims WHERE ip=? AND ts>=?').get(ip, start);
  return row ? row.c : 0;
}

app.get('/', (req,res)=>res.render('index',{siteTitle:SITE_TITLE,payoutSats:FAUCET_PAYOUT_SATS,RECAPTCHA_SITEKEY}));
app.post('/claim', async (req,res)=>{
  const {wallet,token}=req.body; const ip=getIp(req);
  if(!wallet)return res.status(400).json({ok:false,error:'wallet required'});
  if(ipClaimsToday(ip)>=MAX_IP_PER_DAY)return res.status(429).json({ok:false,error:'IP limit reached'});
  const cap=await verifyCaptcha(token,ip); if(!cap.success)return res.status(403).json({ok:false,error:'captcha'});
  const u=db.prepare('SELECT * FROM users WHERE wallet=?').get(wallet); const last=u?u.last_claim_ts:0;
  if(now()-last<CLAIM_COOLDOWN_MIN*60)return res.status(429).json({ok:false,error:'Cooldown active'});
  const ts=now(); const amt=FAUCET_PAYOUT_SATS;
  db.transaction(()=>{db.prepare('INSERT INTO claims(wallet,ip,amount_sats,ts)VALUES(?,?,?,?)').run(wallet,ip,amt,ts);
  if(!u)db.prepare('INSERT INTO users(wallet,last_claim_ts,total_claims)VALUES(?,?,1)').run(wallet,ts);
  else db.prepare('UPDATE users SET last_claim_ts=?,total_claims=total_claims+1 WHERE wallet=?').run(ts,wallet);
  db.prepare('INSERT INTO payouts(wallet,amount_sats,status,created_ts)VALUES(?,?,?,?)').run(wallet,amt,'queued',ts);})();
  try{const r=await faucetpaySend(wallet,amt);res.json({ok:true,r});}catch{res.json({ok:true,message:'Queued'});}
});

app.get('/admin',(req,res)=>res.render('admin_login',{siteTitle:SITE_TITLE}));
app.post('/admin/login',(req,res)=>{if(req.body.pass===ADMIN_PASS){res.cookie('admin','1');res.redirect('/admin/panel');}else res.redirect('/admin?failed=1');});
app.get('/admin/panel',(req,res)=>{if(req.cookies.admin!=='1')return res.redirect('/admin');
  const q=db.prepare('SELECT * FROM payouts WHERE status=?').all('queued');
  res.render('admin_panel',{siteTitle:SITE_TITLE,queued:q});
});
app.listen(PORT,()=>console.log(`✅ Faucet running on port ${PORT}`));
