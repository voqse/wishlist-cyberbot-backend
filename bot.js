import dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

dotenv.config({ path: ['.env.local', '.env'] })

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN not found in .env.local')
}

export default async function initBot(db) {
  const bot = new Telegraf(token)

  bot.command('users', async (ctx) => {
    const user = await db.get('SELECT * FROM users WHERE id = ?', ctx.from.id)
    if (!user || !user.isAdmin) return

    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users')

    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const monthlyActive = await db.get(
      'SELECT COUNT(*) as count FROM users WHERE updatedAt > ?',
      oneMonthAgo.toISOString(),
    )

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weeklyActive = await db.get(
      'SELECT COUNT(*) as count FROM users WHERE updatedAt > ?',
      oneWeekAgo.toISOString(),
    )

    const message = `Total: ${totalUsers.count}
Active (monthly): ${monthlyActive.count}
Active (weekly): ${weeklyActive.count}`

    ctx.reply(message)
  })

  bot.launch()
    .then(() => console.log('Telegram bot started...'))
    .catch(() => console.warn('Failed to launch Telegram bot.'))
}
