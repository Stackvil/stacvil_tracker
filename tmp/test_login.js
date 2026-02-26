const { getISTTime } = require('c:/stackvil/backend/controllers/utilsController');
try {
    const istTimeNow = getISTTime();
    console.log('IST Time:', istTimeNow);
    const now = new Date();
    const isPast = (now >= istTimeNow.sevenPM || istTimeNow.hour >= 19);
    console.log('Is Past 7 PM:', isPast);

    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const isRestricted = isPast;
    const session_token = !isRestricted ? crypto.randomBytes(32).toString('hex') : null;
    console.log('Session Token:', session_token);

    const istTime = getISTTime();
    const today = istTime.date;
    const nowStr = istTime.datetime;
    console.log('Today:', today);
    console.log('Now String:', nowStr);

    console.log('SUCCESS: Logic looks solid.');
} catch (e) {
    console.error('CRASHED:', e);
}
