import fs from 'node:fs'
import path from 'node:path'
import { botToken, createDataCheckString, signData } from '../auth-utils.js'

const mockUser = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'mock-user.json'), 'utf-8'))

function generateInitData(userData) {
  const authDate = Math.floor(Date.now() / 1000)
  const queryId = 'mock_query_id' // Using a static query_id for consistency
  const userJson = JSON.stringify(userData)

  const dataForHash = {
    query_id: queryId,
    user: userJson,
    auth_date: authDate,
  }

  const dataCheckString = createDataCheckString(dataForHash)
  const hash = signData(dataCheckString, botToken)

  const finalParams = new URLSearchParams({
    ...dataForHash,
    hash,
  })

  return finalParams.toString()
}

if (!botToken) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in your .env file.')
  process.exit(1)
}

const initData = generateInitData(mockUser)
console.log('Generated initData string:')
console.log(initData)
