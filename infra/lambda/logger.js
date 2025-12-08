// lambda/logger.js
function log(level, message, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service: 'orders-api',
        function: details.functionName,
        message,
        ...details
    };

    // Avoid circular refs
    if (entry.error && entry.error.stack) {
        entry.errorStack = entry.error.stack;
        delete entry.error.stack;
    }

    console.log(JSON.stringify(entry));
}

module.exports = { log };
