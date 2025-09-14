import crypto from 'crypto';

function validateTelegramAuth(initData, botToken) {
    if (!initData) {
        return { isValid: false, user: null };
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        return { isValid: false, user: null };
    }

    const dataCheckArr = [];
    initData.split('&').forEach(pair => {
        if (pair.startsWith('hash=')) {
            return;
        }
        dataCheckArr.push(pair);
    });

    dataCheckArr.sort();

    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
        return { isValid: false, user: null };
    }

    const user = JSON.parse(decodeURIComponent(params.get('user')));

    return { isValid: true, user };
}

export { validateTelegramAuth };
