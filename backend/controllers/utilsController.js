// Helper function to get current IST time
const getISTTime = () => {
    const now = new Date();
    // Convert to IST by formatting with Asia/Kolkata timezone
    const istString = now.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse the formatted string and convert to MySQL datetime format
    const [date, time] = istString.split(', ');
    const [month, day, year] = date.split('/');
    const formattedDate = `${year}-${month}-${day}`;
    const formattedDateTime = `${formattedDate} ${time}`;

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
