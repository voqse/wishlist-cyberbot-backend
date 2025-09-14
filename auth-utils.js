import crypto from 'crypto';
import dotenv from 'dotenv';

// Load .env file from the root directory
dotenv.config({ path: ['.env.local', '.env'] });

/**
 * Creates a sorted, newline-separated string from an object for hash validation.
 * @param {object} data The data to process.
 * @returns {string} The data check string.
 */
function createDataCheckString(data) {
    const dataCheckArr = [];
    for (const key in data) {
        if (key !== 'hash') {
            dataCheckArr.push(`${key}=${data[key]}`);
        }
    }
    dataCheckArr.sort();
    return dataCheckArr.join('\n');
}

/**
 * Signs a data string using the Telegram bot token.
 * @param {string} dataCheckString The string to sign.
 * @param {string} botToken The Telegram bot token.
 * @returns {string} The hexadecimal HMAC signature.
 */
function signData(dataCheckString, botToken) {
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    return crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;

export { createDataCheckString, signData, botToken };

