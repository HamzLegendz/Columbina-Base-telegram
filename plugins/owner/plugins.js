import fs from 'fs'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

function escapeMarkdownV2(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  switch (command) {
    case 'sf': { // Save File
      if (!text) return conn.sendMessage(m.chat, { text: `⚠️ Kodenya mana?\n\nContoh:\n${usedPrefix + command} plugins/menu.js` }, { quoted: m })
      if (!m.quoted) return conn.sendMessage(m.chat, { text: `⚠️ Balas pesan yang berisi kode yang mau disimpan!` }, { quoted: m })

      try {
        let path = join(process.cwd(), text)
        await fs.writeFileSync(path, m.quoted.text)
        await conn.loadPlugins()
        conn.sendMessage(m.chat, { text: escapeMarkdownV2(`✅ Berhasil disimpan ke ${path}`) }, { quoted: m })
      } catch (e) {
        conn.sendMessage(m.chat, { text: escapeMarkdownV2(`❌ Gagal menyimpan file: ${e.message}`) }, { quoted: m })
      }
      break
    }

    case 'df':
    case 'deletefile': { // Delete File
      if (!args[0]) return conn.sendMessage(m.chat, { text: `⚠️ File apa yang mau dihapus?\n\nContoh:\n${usedPrefix + command} menu` }, { quoted: m })

      try {
        let file = join(process.cwd(), 'plugins', args[0] + '.js')
        if (!existsSync(file)) return conn.sendMessage(m.chat, { text: escapeMarkdownV2(`❌ File plugins/${args[0]}.js tidak ditemukan`) }, { quoted: m })

        unlinkSync(file)
        await conn.loadPlugins()
        conn.sendMessage(m.chat, { text: escapeMarkdownV2(`🗑️ Berhasil hapus plugins/${args[0]}.js`) }, { quoted: m })
      } catch (e) {
        conn.sendMessage(m.chat, { text: escapeMarkdownV2(`❌ Gagal hapus file: ${e.message}`) }, { quoted: m })
      }
      break
    }

    default:
      return conn.sendMessage(m.chat, { text: `⚠️ Command tidak dikenali` }, { quoted: m })
  }
}

handler.help = ['sf', 'df <file>', 'deletefile <file>']
handler.tags = ['owner']
handler.command = /^(sf|df|deletefile)$/i
handler.owner = true

export default handler
