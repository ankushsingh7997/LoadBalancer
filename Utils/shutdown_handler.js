const { get_current_date_time } = require("./time");
const { send_notification } = require("./notification_sender");

class ShutdownHandler {
    constructor() {
        this.cleanupFunctions = [];
        this.endCleanupFunctions = [];
        process.on("SIGINT", () => this.shutdown(`SIGINT`));
        process.on("SIGTERM", () => this.shutdown(`SIGTERM`));
        process.on("unhandledRejection", (reason, promise) => {
            console.error(`${get_current_date_time()} | ERROR | Unhandled Rejection at: ${promise} reason: ${reason}`);
            this.shutdown("unhandledRejection");
        });
        process.on("uncaughtException", (error) => {
            console.error(`${get_current_date_time()} | ERROR | Uncaught Exception: ${error.message}`, error.stack);
            this.shutdown("uncaughtException");
        });
    }

    registerCleanupFunction(fn,end=false) {
        end ? this.endCleanupFunctions.push(fn) : this.cleanupFunctions.push(fn);
    }

    async shutdown(signal) {
        if (["unhandledRejection", "uncaughtException", "SIGTERM"].includes(signal))
            await send_notification(`RECEIVED ${signal}. SHUTTING DOWN GRACEFULLY...`);
        for (const fn of this.cleanupFunctions) {
            await fn();
        }
        for (const fn of this.endCleanupFunctions) {
            await fn();
        }
        process.exit(signal === `unhandledRejection` || signal === `uncaughtException` ? 1 : 0);
    }
}

module.exports = new ShutdownHandler();
