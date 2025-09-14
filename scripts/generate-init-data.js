import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const mockUser = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'mock-user.json'), 'utf-8'));

function generateInitData(userData, botToken) {
    const authDate = Math.floor(Date.now() / 1000);
    const queryId = crypto.randomBytes(12).toString('hex');
    const userJson = JSON.stringify(userData);

    const data = {
      query_id: queryId,
      user: userJson,
      auth_date: authDate,
    };

    const dataCheckArr = [];
    for (const key in data) {
        dataCheckArr.push(`${key}=${data[key]}`);
    }
    dataCheckArr.sort();

    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const finalParams = new URLSearchParams({
        ...data,
        hash,
    });

    return finalParams.toString();
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not defined in your .env file.');
    process.exit(1);
}

const initData = generateInitData(mockUser, botToken);
console.log('Generated initData string:');
console.log(initData);
