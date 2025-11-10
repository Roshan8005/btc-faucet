# 💧 Lightbringer Faucet

A modern, feature-rich Bitcoin faucet with ad promotion and admin dashboard.

## ✨ Features

- 💧 **5 satoshi rewards** every 5 minutes
- 📢 **User ad promotion** - Users can submit their own ads
- 📊 **Admin dashboard** - Protected login with statistics
- 💰 **Google AdSense integration** - Ready for your ad IDs
- 🔒 **IP-based cooldown** - Prevents abuse
- 📱 **Responsive design** - Works on all devices
- ⚡ **FaucetPay integration** - Instant Bitcoin payments

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit the `.env` file with your credentials:

```env
PORT=5000
FAUCETPAY_API_KEY=your_faucetpay_api_key_here
FAUCET_EMAIL=your_email@example.com
ADMIN_USER=your_admin_username
ADMIN_PASS=your_secure_password
ADSENSE_CLIENT=pub-7081655561686996
ADSENSE_SLOT=7916632661
```

**Important:** Replace the placeholder values with your actual credentials:
- Get your FaucetPay API key from: https://faucetpay.io/
- Set a strong admin password
- Add your Google AdSense IDs (optional)

### 3. Start the Server

```bash
npm start
```

The faucet will be available at:
- **Local:** http://localhost:5000
- **Network:** http://0.0.0.0:5000

## 📋 Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `FAUCETPAY_API_KEY` | - | Your FaucetPay API key (required) |
| `FAUCET_EMAIL` | - | Your email address |
| `ADMIN_USER` | admin | Admin username |
| `ADMIN_PASS` | admin123 | Admin password |
| `ADSENSE_CLIENT` | - | Google AdSense client ID |
| `ADSENSE_SLOT` | - | Google AdSense slot ID |
| `CURRENCY` | BTC | Cryptocurrency (BTC) |
| `FAUCET_REWARD_SAT` | 5 | Reward per claim in satoshi |
| `PROMO_COST_SAT` | 2.5 | Cost to promote an ad (future) |
| `COOLDOWN` | 300 | Cooldown in seconds (5 minutes) |

## 🎯 Usage

### For Users

1. Visit the homepage
2. Enter your FaucetPay username or Bitcoin wallet address
3. Click "Claim Reward"
4. Receive 5 satoshi instantly!

### Promote Your Content

1. Click "Promote Your Link"
2. Enter your ad title and URL
3. Submit - your ad will be randomly displayed to users

### Admin Access

1. Visit `/admin`
2. Login with your credentials
3. View statistics:
   - Total users
   - Total payments
   - Active ads
   - Recent transactions

## 📁 Project Structure

```
lightbringer-faucet/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Configuration (create from .env.example)
├── views/                 # EJS templates
│   ├── index.ejs         # Homepage
│   ├── promote.ejs       # Ad promotion page
│   ├── login.ejs         # Admin login
│   └── dashboard.ejs     # Admin dashboard
├── public/               # Static files
│   └── style.css        # Styles
└── lightbringer_faucet.db # SQLite database (auto-created)
```

## 🔒 Security Features

- Session-based admin authentication
- IP-based rate limiting
- Cooldown period between claims
- Input validation and sanitization
- Secure password handling

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Template Engine:** EJS
- **Payment API:** FaucetPay
- **Ads:** Google AdSense

## 📊 Database Schema

### Users Table
- `ip` - User IP address (primary key)
- `last_claim` - Timestamp of last claim
- `balance` - Total satoshi earned
- `total_claims` - Number of claims

### Payments Table
- `id` - Auto-increment ID
- `time` - Payment timestamp
- `ip` - User IP
- `to_address` - Recipient address
- `sat` - Amount in satoshi
- `response` - FaucetPay API response

### Ads Table
- `id` - Auto-increment ID
- `title` - Ad title
- `url` - Target URL
- `time` - Submission timestamp
- `active` - Active status (1/0)

## 🌐 Deployment

### Local/VPS Deployment

```bash
# Clone or upload files
cd lightbringer-faucet

# Install dependencies
npm install

# Configure .env file
nano .env

# Start with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name lightbringer-faucet
pm2 save
pm2 startup
```

### Termux (Android)

```bash
# Install Node.js
pkg install nodejs-lts

# Navigate to project
cd ~/lightbringer-faucet

# Install dependencies
npm install

# Start server
npm start
```

## 🐛 Troubleshooting

### "Cannot find module 'express-session'"
```bash
npm install express-session
```

### Database locked error
Stop all running instances and restart:
```bash
pkill -f node
npm start
```

### FaucetPay API errors
- Verify your API key is correct
- Check your FaucetPay account balance
- Ensure the recipient address is valid

## 📝 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Created by Roshan

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Support

If you like this project, please give it a star on GitHub!

---

**⚡ Powered by Lightbringer | Instant Bitcoin Rewards**
