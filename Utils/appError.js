class appError extends Error {
    constructor(message, status_code) {
        super(message);
        this.statusCode = status_code || 400;
        this.status = false;
        this.is_operational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = appError;
