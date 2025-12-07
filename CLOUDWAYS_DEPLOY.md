# Cloudways Deployment Guide for ST Benateeta Kava Bar

## Prerequisites
- Cloudways account
- Server with SSH access
- Domain name (optional)

---

## Step 1: Create Server on Cloudways

1. Log in to Cloudways → **Servers** → **Launch**
2. Choose:
   - **Cloud Provider**: DigitalOcean (cheapest) or your preference
   - **Server Size**: 1GB RAM minimum (2GB recommended)
   - **Location**: Closest to your users
3. Wait for server to be ready (~7 minutes)

---

## Step 2: Create Application

1. Go to **Applications** → **Add Application**
2. Select **Custom App (PHP)** - we'll convert it to Node.js
3. Choose your server
4. Name: `kava-bar`
5. Click **Add Application**

---

## Step 3: Get Server Credentials

Go to **Server Management** → **Master Credentials**:
- Note: **Public IP**, **Username**, **Password**

---

## Step 4: SSH into Server

```bash
ssh master@YOUR_SERVER_IP
# Enter password when prompted
```

---

## Step 5: Install Node.js

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # Should show v18.x.x
npm -v    # Should show 9.x.x or higher

# Install PM2 globally
sudo npm install -g pm2
```

---

## Step 6: Upload Application Files

### Option A: Git Clone (Recommended)
```bash
cd /home/master/applications/YOUR_APP_FOLDER/public_html
rm -rf *  # Clear default files
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

### Option B: SFTP Upload
1. Use FileZilla or WinSCP
2. Connect with SFTP credentials from Cloudways
3. Upload all files to `public_html` folder

---

## Step 7: Install & Build

```bash
cd /home/master/applications/YOUR_APP_FOLDER/public_html

# Install dependencies
npm install

# Build production version
npm run build

# Create required directories
mkdir -p database logs database/backups

# Set permissions
chmod -R 755 database logs
```

---

## Step 8: Start Application with PM2

```bash
# Start the app
pm2 start npm --name "kava-bar" -- start

# Save PM2 configuration
pm2 save

# Enable startup on reboot
pm2 startup
# Run the command it outputs
```

---

## Step 9: Configure Nginx

In Cloudways Panel:
1. Go to **Application** → **Application Settings** → **Vhost**
2. Add custom Nginx configuration:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

3. Click **Save** and wait for configuration to apply

---

## Step 10: Set Up SSL (HTTPS)

1. In Cloudways: **Application** → **SSL Certificate**
2. Select **Let's Encrypt**
3. Enter your domain (or use temporary Cloudways URL)
4. Click **Install Certificate**

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check app status |
| `pm2 logs kava-bar` | View live logs |
| `pm2 restart kava-bar` | Restart app |
| `pm2 stop kava-bar` | Stop app |
| `pm2 delete kava-bar` | Remove app from PM2 |

---

## Updating the App

```bash
cd /home/master/applications/YOUR_APP_FOLDER/public_html

# If using Git
git pull origin main

# Rebuild
npm install
npm run build

# Restart
pm2 restart kava-bar
```

---

## Troubleshooting

### App not loading
```bash
pm2 logs kava-bar --lines 50
```

### Port already in use
```bash
pm2 delete kava-bar
pm2 start npm --name "kava-bar" -- start
```

### Database issues
```bash
# Check permissions
ls -la database/
chmod -R 755 database/
```

---

## Default Login

- **Username**: admin
- **Password**: admin123

⚠️ **Change the admin password immediately after deployment!**

