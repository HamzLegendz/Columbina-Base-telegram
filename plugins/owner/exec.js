import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
import { escapeMarkdownV2 } from '../../helpers/utils.js'

const exec = promisify(_exec).bind(cp)

const handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(m.chat.id, {
      text: 'Masukkan perintah shell!\n\nContoh:\n`$ ls -la`\n`/exec ls -la`'
    })
  }

  await conn.sendMessage(m.chat.id, { text: 'Executing...' })

  let o
  try {
    o = await exec(text.trim())
  } catch (e) {
    o = e
  } finally {
    let { stdout, stderr } = o

    if (stdout && stdout.trim()) {
      await conn.sendMessage(m.chat.id, {
        text: '```shell\n' + escapeMarkdownV2(stdout.trim()) + '\n```'
      })
    }
    if (stderr && stderr.trim()) {
      await conn.sendMessage(m.chat.id, {
        text: '```shell\n' + escapeMarkdownV2(stderr.trim()) + '\n```'
      })
    }
  }
}

handler.command = /^(exec|\$)$/i
handler.help = ['$ <command>', 'exec <command>']
handler.tags = ['owner']
handler.owner = true

export default handler
