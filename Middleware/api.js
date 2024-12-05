const catchAsync = require("../Utils/catchAsync");
const { logger } = require("../Utils/logger");

const api_logs = catchAsync(async (req, res, next) => {
    const start_time = Date.now();
    let user_id = req.user?._id || "none";
    let payload = req.body || {};

    // Store the original end method
    const originalEnd = res.end;

    // Override the end method to log only once
    res.end = function (chunk, encoding) {
        // Calculate time taken
        const time_taken = Date.now() - start_time;

        // Attempt to parse response if possible
        let responseBody;
        try {
            responseBody = chunk ? JSON.parse(chunk.toString()) : null;
        } catch {
            responseBody = chunk ? chunk.toString() : null;
        }

        // Create comprehensive log object
        let log_entry = {
            received_at: start_time,
            time_taken,
            user_id,
            method: req.method,
            url: req.originalUrl,
            status_code: res.statusCode,
            received_payload: payload,
            sent_payload: responseBody,
        };

        // Optional: Add original IP for proxied requests
        if (req.headers["x-forwarded-for"]) {
            log_entry.original_ip = req.headers["x-forwarded-for"];
        }

        // Log the single, comprehensive entry
        logger.api(log_entry);

        // Call the original end method
        originalEnd.call(this, chunk, encoding);
    };

    next();
});

module.exports = api_logs;
