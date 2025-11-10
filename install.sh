#!/bin/bash
# ═══════════════════════════════════════════════════
# 💧 Lightbringer Faucet - Automated Installer
# ═══════════════════════════════════════════════════

set -e

echo "🌐 ═══════════════════════════════════════════════════"
echo "💧 Lightbringer Faucet Installer"
echo "🌐 ═══════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📦 Please install Node.js first:"
    echo "   - Termux: pkg install nodejs-lts"
    echo "   - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   - CentOS/RHEL: sudo yum install nodejs npm"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
PORT=5000
FAUCETPAY_API_KEY=ENTER_YOUR_FAUCETPAY_KEY_HERE
FAUCET_EMAIL=your_email@example.com
ADMIN_USER=admin
ADMIN_PASS=CHANGE_THIS_PASSWORD
ADSENSE_CLIENT=pub-7081655561686996
ADSENSE_SLOT=7916632661
CURRENCY=BTC
FAUCET_REWARD_SAT=5
PROMO_COST_SAT=2.5
COOLDOWN=300
SESSION_SECRET=change-this-secret-key-to-random-string
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🌐 ═══════════════════════════════════════════════════"
echo "✅ Installation Complete!"
echo "🌐 ═══════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: Edit your .env file before starting!"
echo ""
echo "Required changes:"
echo "  1. FAUCETPAY_API_KEY → Your FaucetPay API key"
echo "  2. ADMIN_USER → Your admin username"
echo "  3. ADMIN_PASS → Your secure password"
echo ""
echo "Edit now:"
echo "  nano .env"
echo ""
echo "Then start the server:"
echo "  npm start"
echo ""
echo "Access your faucet at:"
echo "  http://localhost:5000"
echo ""
echo "🌐 ═══════════════════════════════════════════════════"
