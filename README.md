# NetDrop - Serverless P2P File Sharing

![NetDrop Logo](https://img.shields.io/badge/NetDrop-P2P-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA-818cf8)
![Serverless](https://img.shields.io/badge/Serverless-WebRTC-orange)

**NetDrop** is a beautiful, serverless peer-to-peer file sharing app that works directly in your browser. Share files with anyone on the same network instantly - no signup, no uploads, no servers storing your files.

## ✨ Features

- **🌐 No Server Uploads** - Files transfer directly between devices via WebRTC
- **📱 PWA Ready** - Install as an app on any device
- **🔒 Private** - Files never leave your network
- **⚡ Instant Discovery** - Devices on your network appear automatically
- **📁 Multi-File Support** - Send multiple files at once
- **👀 File Preview** - Preview images and videos before downloading
- **📋 Transfer History** - Track sent and received files
- **🎨 Beautiful UI** - Glassmorphism design with dark theme

## 🚀 Live Demo

**[Try NetDrop Now →](https://net2drop.netlify.app)**

## 📸 How It Works

1. **Open NetDrop** on two devices connected to the same network
2. **See each other** appear automatically in the device grid
3. **Click on a device** to select files to send
4. **Drag & drop** files onto a device for quick transfer
5. **Preview & download** received files

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, CSS (Glassmorphism)
- **Build Tool:** Vite + PWA Plugin
- **WebRTC:** PeerJS for peer-to-peer connections
- **Discovery:** Ably Realtime for presence/signaling
- **Hosting:** Netlify (static hosting)

## 📦 Self-Hosting

### Prerequisites
- Node.js 18+
- Ably API Key (free tier available at [ably.com](https://ably.com))

### Setup

```bash
# Clone the repository
git clone https://github.com/MrSamSeen/NetDrop.git
cd NetDrop

# Install dependencies
npm install

# Create .env file with your Ably key
echo "VITE_ABLY_KEY=your-ably-api-key" > .env

# Start development server
npm run dev

# Build for production
npm run build
```

### Deploy to Netlify

1. Push to GitHub
2. Connect repo to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variable: `VITE_ABLY_KEY`
6. Add `SECRETS_SCAN_OMIT_KEYS` = `VITE_ABLY_KEY` (to allow client-side key)

## 🎮 Usage

| Action | How |
|--------|-----|
| Send files | Click on a device → Select files |
| Quick send | Drag & drop files onto a device |
| Send multiple | Select multiple files in file picker |
| Preview files | Files appear in preview panel |
| Download | Click "Download" on any file |
| Download all | Click "Download All" |
| Edit your name | Click on your name in the header |
| View history | Click 📋 button |
| Toggle debug | Click 🐛 Debug button |

## 🔐 Privacy & Security

- **No server storage** - Files transfer directly between browsers
- **No accounts** - No signup, no tracking
- **Local network** - Devices find each other via shared network IP
- **WebRTC encryption** - DTLS encryption for all transfers

## 📝 Roadmap

- [ ] File transfer progress bar
- [ ] Custom room codes for sharing across networks
- [ ] End-to-end encryption
- [ ] Folder sharing
- [ ] QR code pairing

## ☕ Support

If NetDrop helped you, consider supporting:

**[Buy Me a Coffee](https://buymeacoffee.com/samseen)**

## 📝 License

MIT License - see LICENSE file for details.

---

Created with ❤️ by [SamSeen](https://github.com/MrSamSeen/)
