const cron = require("node-cron");
const { initialLaunch } = require("../AWS/initial_launch");
const { terminateAllInstance } = require("../AWS/launcher");
const { logger } = require("../Utils/logger");
const healthCheckManager = require("../HealthCheckManager/healthCheckManager");

const startCron = () => {
    try {
        // -Schedule initial launch at 8:47 AM IST
        const start = "47 8 * * *";
        const end = "35 15 * * *";
        cron.schedule(
            "52 23 * * *",
            async () => {
                try {
                    logger.info("🚀 Cron Job Initiated: Launching Servers for the Day");
                    await initialLaunch();
                } catch (error) {
                    logger.error("Failed to launch servers via cron job:", error);
                }
            },
            {
                scheduled: true,
                timezone: "Asia/Kolkata",
            }
        );

        // -Schedule terminate all instances at 3:35 PM IST
        cron.schedule(
            "55 23 * * *",
            async () => {
                try {
                    logger.info("🔴 Cron Job Initiated: Terminating All Server Instances");
                    await terminateAllInstance();
                    healthCheckManager.stopPeriodicHealthChecks();
                } catch (error) {
                    logger.error("Failed to terminate instances via cron job:", error);
                }
            },
            {
                scheduled: true,
                timezone: "Asia/Kolkata",
            }
        );

        logger.info("✅ Cron Jobs Successfully Configured for Daily Server Management");
    } catch (error) {
        logger.error(error);
    }
};

module.exports = { startCron };
