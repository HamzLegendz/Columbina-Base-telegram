<div align="center">
  <a href="https://github.com/HamzLegendz/Columbina-Base-telegram">
    <img src="https://cdn.ypnk.biz.id/yp/a64loqf4.jpg" alt="Columbina-Base" width="600">
  </a>
  <h1>Columbina-Base-telegram</h1>
  <p>A modular and advanced boilerplate plugins Esm for building multifunctional Telegram bots using Node.js and Telegraf.</p>
</div>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v18.x-339933?style=for-the-badge&logo=node.js" alt="Node.js Version"></a>
  <a href="https://telegraf.js.org"><img src="https://img.shields.io/badge/Telegraf-v4.x-2AABEE?style=for-the-badge&logo=telegram" alt="Telegraf Version"></a>
  <a href="https://github.com/HamzLegendz/Columbina-Base-telegram/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HamzLegendz/Columbina-Base-telegram?style=for-the-badge&color=yellow" alt="License"></a>
  <img src="https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge" alt="Status">
</p>

<p align="center">
  <a href="https://t.me/gudang_garamsgn"><img src="https://img.shields.io/badge/Telegram-Join%20Channel-blue?style=for-the-badge&logo=telegram" alt="Telegram Channel"></a>
  <a href="https://whatsapp.com/channel/0029Vb8jJcZK5cDOnN0ZBB12"><img src="https://img.shields.io/badge/WhatsApp-Join%20Channel-green?style=for-the-badge&logo=whatsapp" alt="WhatsApp Channel"></a>
  <a href="https://github.com/HamzLegendz"><img src="https://img.shields.io/badge/GitHub-Follow-black?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

---

## About Columbina-Base-telegram

Columbina-Base-telegram is a powerful and modular boilerplate designed to accelerate the development of complex Telegram bots. Featuring a dynamic plugins-based architecture, it allows developers to add, remove, or modify features without touching the core codebase. With a robust client wrapper, modern out-of-the-box features, and a stable foundation, it's built for scalability and ease of use.

## Features

| Feature                  | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| **Plugin Architecture**  | Dynamically add new functionality by creating JavaScript files in `/plugins`. |
| **Advanced Client Wrapper** | High-level abstractions (`conn.sendMessage`, `m.reply`) for simplified message and media sending. |
| **Smart Context Helpers** | Properties like `m.target`, `m.quoted`, and `m.isAdmin` for cleaner, intuitive plugin code. |
| **State Management**     | Built-in session middleware for interactive commands and JSON-based data persistence. |
| **High Performance**     | In-memory caching (node-cache) for faster data access and API responses.    |
| **Comprehensive Built-in Features** | Includes generative, group managemen, and dozens of ready-to-use utilities. |
| **Payment Integration**  | Built-in support for Telegram payments (invoices/development stage) to monetize your bot      |

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Git**: For cloning the repository

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/HamzLegendz/Columbina-Base-telegram.git

# Navigate to the project directory
cd Columbina-Base-telegram

# Install dependencies
npm install
```

### 3. Configuration
Create configuration file:
```bash
cp config.example.js config.js
```
Edit `config.js` and fill all required values, especially `global.bottoken`.

Set Owner:
Open `owner.json` and enter your Telegram User ID to get access to owner-only commands.

### 4. Running the Bot
Production Mode:
```bash
npm start
```

Development Debug/Auto restart Mode:
```bash
npm run dev
```

---

## Developer Guide: Feature Implementation

The core of this framework is the ease of creating plugins. Every `.js` file in the `/plugins` directory is a command. The bot will load them automatically.

### Basic Plugin Structure
```javascript
const handler = async (m, { text }) => {
    await m.reply(`Hello, ${m.sender.first_name}! You typed: ${text}`);
};

handler.command = /^(hello|halo)$/i;
handler.help = ['hello <text>'];
handler.tags = ['main'];
handler.limit = true;
handler.owner = false;

export default handler;
```

### Feature Examples

#### 1. Sending Text Messages & Replies
```javascript
const handler = async (m, { conn, text }) => {
    await conn.sendMessage(m.chat.id, 'Hidup Blonde');
    await m.reply('hello')
};
handler.command = /^sendtext$/i;
handler.help = ['sendtext'];
handler.tags = ['examples'];
export default handler;
```

#### 2. Sending Media (Image, Video, Audio)
```javascript
import fs from 'fs';
const handler = async (m, { conn }) => {
    await conn.sendMessage(m.chat.id, {
        image: { url: 'https://cataas.com/cat' },
        caption: 'Nih Neko.'
    });

    if (fs.existsSync('./media/audio.mp3')) {
        await conn.sendMessage(m.chatId, {
            audio: fs.createReadStream('./media/audio.mp3'),
            /*voice: 'https://cdn.ypnk.biz.id/yp/v6ecbmp4.mp3'
            caption: 'example voice note'*/
        });
    }

    const videoFileId = 'BAACAgIAAxkBAAIC...buffer or url';
    await conn.sendMessage(m.chatId, { video: videoFileId });
};
handler.command = /^sendmedia$/i;
handler.help = ['sendmedia'];
handler.tags = ['examples'];
export default handler;
```

#### 3. Sending Interactive Buttons
```javascript
const handler = async (m, { conn, command }) => {
    if (command === 'inlinebuttons') {
        await conn.sendMessage(m.chatId, {
            text: 'This is an inline button example.',
            buttons: [
                [
                    { displayText: 'Google', url: 'https://google.com' },
                    { displayText: 'Info bot', buttonId: '/info' }
                ],
                [{ displayText: 'Full Menu', buttonId: '/allmenu' }]
            ]
        });
    } else if (command === 'keyboardbuttons') {
        await conn.sendMessage(m.chatId, {
            text: 'Keyboardnyo',
            keyboard: [
                ['Button A', 'Button B'],
                ['Close Keyboard']
            ]
        });
    }
};
handler.command = /^(inlinebuttons|keyboardbuttons)$/i;
handler.help = ['inlinebuttons', 'keyboardbuttons'];
handler.tags = ['examples'];
export default handler;
```

#### 4. Using Smart Context Helpers
```javascript
const handler = async (m) => {
    let text = `*--- Context Analysis ---*\n\n`;
    text += `*Sender:* ${m.sender.first_name} (\`${m.sender.id}\`)\n`;
    text += `*Command Target:* ${m.target.first_name} (\`${m.target.id}\`)\n`;
    text += `*Is Group?:* ${m.isGroup ? 'Yes' : 'No'}\n`;
    
    if (m.isGroup) {
        text += `*Are you Admin?:* ${await m.isAdmin ? 'Yes' : 'No'}\n`;
        text += `*Is Bot Admin?:* ${await m.isBotAdmin ? 'Yes' : 'No'}\n`;
    }

    if (m.quoted) {
        text += `\nYou are replying to a message with ID: \`${m.quoted.message_id}\``;
    }

    await m.reply(text);
};
handler.command = /^testhelper$/i;
handler.help = ['testhelper'];
handler.tags = ['examples'];
export default handler;
```

#### 5. Payment Integration (Invoice)//not working(bug)
```javascript
const handler = async (m, { conn }) => {
    const chatId = m.chat.id;
    const invoiceDetails = {
        title: 'Donate a Cup of Coffee',
        description: 'Support the developer to stay awake with a delicious cup of coffee!',
        payload: `donation_${m.sender.id}_${Date.now()}`,
        providerToken: 'YOUR_TEST_PROVIDER_TOKEN',
        currency: 'IDR',
        prices: [
            { label: 'Premium Coffee', amount: 15000 },
            { label: 'Development Tax', amount: 500 }
        ],
        photoUrl: 'https://i.imgur.com/8KWVKs1.jpeg',
        photoWidth: 500,
        photoHeight: 500,
        needShippingAddress: false,
        needEmail: true
    };

    try {
        await conn.sendInvoice(chatId, invoiceDetails);
    } catch (e) {
        console.error('Failed to send invoice:', e);
        await m.reply(`Sorry, an error occurred while creating the invoice. Error: ${e.message}`);
    }
};
handler.command = /^(donate|invoice)$/i;
handler.help = ['donate'];
handler.tags = ['tools'];
export default handler;
```

---
##  Kontributor

Terima kasih kepada semua kontributor yang telah berkontribusi pada proyek ini!  
Ingin ikut berkontribusi? Silakan buat **Pull Request** atau buka **Issue** untuk ide/bug baru.

<table>
  <tr>
    <td align="center" width="160" style="padding:12px;border:1px solid #e1e4e8;">
      <a href="https://github.com/FeliciaLonely">
        <img src="https://avatars.githubusercontent.com/FeliciaLonely?s=120" width="96" height="96" alt="FeliciaLonely">
        <br><sub><b>FeliciaLonely</b></sub>
      </a>
      <br>
      <a href="https://github.com/FeliciaLonely?tab=followers">
        <img src="https://img.shields.io/github/followers/FeliciaLonely?label=Follow&style=social" alt="Follow FeliciaLonely">
      </a>
    </td>
    <td align="center" width="160" style="padding:12px;border:1px solid #e1e4e8;">
      <a href="https://github.com/HamzLegendz">
        <img src="https://avatars.githubusercontent.com/HamzLegendz?s=120" width="96" height="96" alt="HamzLegendz">
        <br><sub><b>HamzLegendz</b></sub>
      </a>
      <br>
      <a href="https://github.com/HamzLegendz?tab=followers">
        <img src="https://img.shields.io/github/followers/HamzLegendz?label=Follow&style=social" alt="Follow HamzLegendz">
      </a>
    </td>
  </tr>
</table>