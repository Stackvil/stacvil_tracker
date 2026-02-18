// Helper function to get current IST time
const getISTTime = () => {
    const now = new Date();

    // Use Intl.DateTimeFormat for reliable parsing across environments (Windows/Linux)
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    const formattedDate = `${year}-${month}-${day}`;
    const formattedDateTime = `${formattedDate} ${hour}:${minute}:${second}`;

    return {
        date: formattedDate,
        datetime: formattedDateTime,
        timestamp: now
    };
};

// @desc    Get current server time in IST
// @route   GET /api/utils/time
const getServerTime = (req, res) => {
    const now = new Date();
    // Asia/Kolkata is UTC+5:30
    res.json({
        serverTime: now.toISOString(),
        timezone: 'Asia/Kolkata',
        offset: '+05:30'
    });
};

module.exports = {
    getServerTime,
    getISTTime
};
