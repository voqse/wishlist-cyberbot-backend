import { botToken, createDataCheckString, signData } from './auth-utils.js'

function validateTelegramAuth(initData) {
  if (!initData) {
    return { isValid: false, user: null }
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) {
    return { isValid: false, user: null }
  }

  const dataForCheck = {}
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      dataForCheck[key] = value
    }
  }

  const dataCheckString = createDataCheckString(dataForCheck)
  const hmac = signData(dataCheckString, botToken)

  if (hmac !== hash) {
    return { isValid: false, user: null }
  }

  const user = JSON.parse(dataForCheck.user)

  return { isValid: true, user }
}

export { validateTelegramAuth }
