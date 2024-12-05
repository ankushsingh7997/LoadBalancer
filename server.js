const { startCron } = require("./Cron/cronjob");

try {
    const { PORT } = require("./Env/env");
    const { logger } = require("./Utils/logger");
    const app = require("./App/app");
    const _ = require("./State/store_state");

    const server = app.listen(PORT, () => {
        logger.info(`App successfully listening on port ${PORT}`);
        logger.notify("LoadBalancer started successfully");
    });
    startCron();
} catch (err) {
    logger.error("application error", err);
}
