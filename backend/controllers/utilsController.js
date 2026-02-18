// Helper function to get current IST time
const getISTTime = () => {
    const now = new Date();

    // Create a date object in IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    // Format to YYYY-MM-DD
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const hours = String(istTime.getUTCHours()).padStart(2, '0');
    const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    // Standard ISO 8601 with +05:30 offset for IST
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;

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
