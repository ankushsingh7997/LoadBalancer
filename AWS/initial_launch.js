const { CONFIG } = require("../Env/env");
const healthCheckManager = require("../HealthCheckManager/healthCheckManager");
// const healthCheckManager = require("../HealthCheckManager/healthCheckManager");
const { logger } = require("../Utils/logger");
const { launchInstanceFromAMI } = require("./launcher");

exports.initialLaunch = async () => {
    try {
        logger.notify("Initiating server launch for order listener");
        let servers = [];

        for (let i = 0; i < CONFIG.INITIAL_INSTANCE; i++) {
            const { instanceId, serverName, isMasterServer, ip, message } = await launchInstanceFromAMI(i === 0, true);
            if (!instanceId) {
                return;
            }

            logger.notify(`Launched instance: 
            - Instance ID:      ${instanceId}
            - Server Name:      ${serverName}
            - IP:              ${ip}`);

            servers.push({ instanceId, serverName, isMasterServer });
        }

        logger.notify(`Total instances launched: ${servers.length}`);
    } catch (error) {
        logger.error("Error during server launch:", error);
    }
};

setTimeout(() => {
    healthCheckManager.startPeriodicHealthChecks();
    logger.notify(`Initiation Health Check Manager For All Server.Please Check Live Monitoring On Redis`);
}, CONFIG.START_HEALTH_MANAGER);
