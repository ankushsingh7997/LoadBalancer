exports.LOG_LEVELS = {
    notify: 1,
    error: 2,
    request: 3,
    order: 4,
    api: 5,
    db: 6,
    warn: 7,
    info: 8,
    debug: 9,
    websocket: 10,
    notifylog:11
};

exports.LEVEL = process.env.NODE_ENV?.trim() === "production" ? "info" : "debug";
exports.LOG_BATCH_SIZE = 25;
exports.LOG_INTERVAL = 5000;
