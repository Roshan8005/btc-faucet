# 🚀 Lightbringer Faucet - Quick Setup Guide

## ✅ Installation Complete!

Your Lightbringer Faucet is now installed and running!

---

## 📋 What You Need to Do Next

### 1. **Configure Your Credentials**

Edit the `.env` file and replace these values:

```bash
nano .env
```

**Required Changes:**
- `FAUCETPAY_API_KEY` → Get from https://faucetpay.io/dashboard/developer
- `ADMIN_USER` → Your admin username
- `ADMIN_PASS` → Your secure password (change from default!)
- `ADSENSE_CLIENT` → Your Google AdSense client ID (optional)
- `ADSENSE_SLOT` → Your Google AdSense slot ID (optional)

**Example:**
```env
FAUCETPAY_API_KEY=abc123xyz789yourkey
ADMIN_USER=myadmin
ADMIN_PASS=MySecurePassword123!
```

### 2. **Restart the Server**

After editing `.env`, restart the server:

```bash
# Stop the current server
pkill -f "node server.js"

# Start again
npm start
```

---

## 🌐 Access Your Faucet

Once running, access your faucet at:

- **Homepage:** http://localhost:5000
- **Admin Panel:** http://localhost:5000/admin
- **Promote Page:** http://localhost:5000/promote

---

## 🎯 Features Overview

### For Users:
1. Visit homepage
2. Enter FaucetPay username or BTC wallet
3. Click "Claim Reward"
4. Receive 5 satoshi instantly!

### For Advertisers:
1. Click "Promote Your Link"
2. Enter ad title and URL
3. Submit - ad appears randomly to users

### For Admins:
1. Login at `/admin`
2. View dashboard with:
   - Total users
   - Total payments
   - Active ads
   - Recent transactions
3. Manage ads (delete spam)

---

## ⚙️ Configuration Options

Edit `.env` to customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `PORT` | 5000 | Server port |
| `FAUCET_REWARD_SAT` | 5 | Satoshi per claim |
| `COOLDOWN` | 300 | Seconds between claims (5 min) |
| `PROMO_COST_SAT` | 2.5 | Ad promotion cost (future) |

---

## 🔒 Security Tips

1. **Change default admin password immediately!**
2. Use a strong password (mix of letters, numbers, symbols)
3. Keep your FaucetPay API key secret
4. Don't share your `.env` file
5. Use HTTPS in production (with reverse proxy like nginx)

---

## 📊 Data Storage

All data is stored in JSON files in the `data/` directory:
- `users.json` - User claims and balances
- `payments.json` - Payment history
- `ads.json` - Submitted advertisements

**Backup regularly!**

```bash
# Backup data
cp -r data/ data_backup_$(date +%Y%m%d)/
```

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :5000

# Kill existing process
pkill -f "node server.js"

# Start again
npm start
```

### Can't access from other devices
Make sure you're using the correct network IP:
```bash
# Find your IP
ip addr show | grep inet
```

Then access: `http://YOUR_IP:5000`

### FaucetPay errors
- Verify API key is correct
- Check FaucetPay account has balance
- Ensure recipient address is valid
- Check FaucetPay API status

---

## 🌐 Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name lightbringer-faucet

# Save configuration
pm2 save

# Auto-start on boot
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/lightbringer.service`:

```ini
[Unit]
Description=Lightbringer Faucet
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/lightbringer-faucet
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable lightbringer
sudo systemctl start lightbringer
```

---

## 📱 Termux (Android) Setup

```bash
# Install Node.js
pkg install nodejs-lts

# Navigate to project
cd ~/lightbringer-faucet

# Install dependencies
npm install

# Edit configuration
nano .env

# Start server
npm start
```

Access on your phone: http://localhost:5000

---

## 🔄 Updating

To update the faucet:

```bash
# Backup data first!
cp -r data/ data_backup/

# Pull new code (if using git)
git pull

# Reinstall dependencies
npm install

# Restart server
pm2 restart lightbringer-faucet
```

---

## 📞 Support

- Check README.md for detailed documentation
- Review server logs for errors
- Ensure all dependencies are installed
- Verify .env configuration is correct

---

## 🎉 You're All Set!

Your Lightbringer Faucet is ready to use!

**Next Steps:**
1. Configure your `.env` file
2. Restart the server
3. Test a claim
4. Share your faucet URL
5. Monitor the admin dashboard

**⚡ Powered by Lightbringer | Instant Bitcoin Rewards**
