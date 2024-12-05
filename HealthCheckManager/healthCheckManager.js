const axios = require("axios");
const { logger } = require("../Utils/logger");
const { RedisConnection } = require("../Utils/redis");
const stateManager = require("../StateManagement/stateManager");
RedisConnection;

class HealthCheckManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.redisClient = RedisConnection;
        this.healthStatus = new Map();
        this.consecutiveFailures = new Map();
        this.interval = null;

        this.config = {
            checkInterval: 30000,
            timeout: 3000,
            maxHistoryEntries: 50,
            failureThreshold: 5,
        };
    }

    async performHealthCheck(instanceId, ip) {
        const healthCheckTime = Date.now();
        const healthCheckEntry = {
            instanceId,
            timestamp: healthCheckTime,
            ip,
        };

        try {
            const startTime = Date.now();
            const response = await axios.get(`http://${ip}/api/v1/healthCheck`, {
                timeout: this.config.timeout,
            });

            const responseTime = Date.now() - startTime;

            healthCheckEntry.status = "success";
            healthCheckEntry.responseTime = responseTime;
            healthCheckEntry.statusCode = response.status;

            // -Reset consecutive failures on successful health check
            this.consecutiveFailures.set(instanceId, 0);

            await this._recordHealthCheck(healthCheckEntry);
            return true;
        } catch (error) {
            healthCheckEntry.status = "failure";
            healthCheckEntry.error = error.message;
            healthCheckEntry.responseTime = null;

            // -Increment consecutive failures
            const currentFailures = (this.consecutiveFailures.get(instanceId) || 0) + 1;
            this.consecutiveFailures.set(instanceId, currentFailures);

            // -Check if failure threshold is reached
            if (currentFailures >= this.config.failureThreshold) {
                this._notifyFailureThreshold(instanceId, ip, currentFailures, error);
            }

            await this._recordHealthCheck(healthCheckEntry);
            return false;
        }
    }

    _notifyFailureThreshold(instanceId, ip, failureCount, error) {
        const notificationDetails = {
            instanceId,
            ip,
            failureCount,
            errorMessage: error.message,
            timestamp: new Date().toISOString(),
        };

        logger.notify("HEALTH_CHECK_FAILURE_THRESHOLD_EXCEEDED", {
            message: `Instance ${instanceId} has failed health checks ${failureCount} consecutive times`,
            details: notificationDetails,
        });
    }

    async _recordHealthCheck(healthCheckEntry) {
        try {
            if (!this.redisClient.connected) return;
            const redisKey = "OrderListenerHealthManager";

            await this.redisClient.client.LPUSH(`${redisKey}:history:${healthCheckEntry.instanceId}`, JSON.stringify(healthCheckEntry));

            await this.redisClient.client.LTRIM(`${redisKey}:history:${healthCheckEntry.instanceId}`, 0, this.config.maxHistoryEntries - 1);

            const statsKey = `${redisKey}:stats:${healthCheckEntry.instanceId}`;

            const statField = healthCheckEntry.status === "success" ? "totalSuccesses" : "totalFailures";

            await this.redisClient.client.HINCRBY(statsKey, statField, 1);

            await this.redisClient.client.HSET(statsKey, "lastCheckedAt", healthCheckEntry.timestamp);

            logger.info(`Health Check Recorded: ${healthCheckEntry.instanceId} - ${healthCheckEntry.status}`);
        } catch (error) {
            logger.error("Failed to record health check", error);
        }
    }

    async runHealthChecks() {
        const instanceIPs = this.stateManager.state.instanceIPs;

        const healthCheckPromises = Array.from(instanceIPs.entries()).map(([instanceId, ip]) => this.performHealthCheck(instanceId, ip));

        await Promise.allSettled(healthCheckPromises);
    }

    startPeriodicHealthChecks() {
        setTimeout(() => this.runHealthChecks(), 15000);

        this.interval = setInterval(() => {
            this.runHealthChecks();
        }, this.config.checkInterval);
    }
    stopPeriodicHealthChecks() {
        if (this.interval) clearInterval(this.interval);
    }

    async getHealthCheckAnalytics(instanceId) {
        try {
            if (!this.redisClient.connected) return;
            const redisKey = "OrderListenerHealthManager";

            const stats = await this.redisClient.client.HGETALL(`${redisKey}:stats:${instanceId}`);

            const history = await this.redisClient.client.LRANGE(`${redisKey}:history:${instanceId}`, 0, this.config.maxHistoryEntries - 1);

            return {
                stats: {
                    totalSuccesses: parseInt(stats.totalSuccesses || "0"),
                    totalFailures: parseInt(stats.totalFailures || "0"),
                    lastCheckedAt: stats.lastCheckedAt ? new Date(parseInt(stats.lastCheckedAt)) : null,
                },
                history: history.map((entry) => JSON.parse(entry)),
            };
        } catch (error) {
            logger.error("Failed to retrieve health check analytics", error);
            return null;
        }
    }
}
const healthCheckManager = new HealthCheckManager(stateManager);

module.exports = healthCheckManager;
