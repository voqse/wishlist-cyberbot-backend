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
    params.delete('hash');

    const dataCheckArr = [];
    // The data is sorted alphabetically by key
    const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());

    for (const [key, value] of sortedParams.entries()) {
        dataCheckArr.push(`${key}=${value}`);
    }

    const dataCheckString = dataCheckArr.join('\\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
        return { isValid: false, user: null };
    }

    const user = JSON.parse(params.get('user'));

    return { isValid: true, user };
}

export { validateTelegramAuth };

