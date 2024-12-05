const { createClient } = require("redis");
const { REDIS_NAME, REDIS_HOST_URL, REDIS_PORT, REDIS_PASSWORD } = require("../Env/env");
const { logger } = require("./logger");

const RedisConnection = {
    client: null,
    connected: false,
    lastErrorMessage: null,
};

function prepareRedisConfig() {
    return REDIS_PASSWORD === "NONE"
        ? { url: `redis://${REDIS_HOST_URL}:${REDIS_PORT}` }
        : { url: `redis://:${REDIS_PASSWORD}@${REDIS_HOST_URL}:${REDIS_PORT}` };
}

function createRetryStrategy(retries, cause) {
    logger.warn(`Reconnection attempt: ${retries}`, { error: cause?.message });
    return Math.min(retries * 1000, 120000);
}

function initializeRedisConnection() {
    const redis_config = prepareRedisConfig();

    const client = createClient({
        ...redis_config,
        socket: {
            connectTimeout: 10000,
            reconnectStrategy: createRetryStrategy,
        },
    });

    client.on("connect", () => {
        logger.info(`Redis client connected to ${REDIS_NAME}`);
        RedisConnection.client = client;
        RedisConnection.connected = true;
        RedisConnection.lastErrorMessage = null;
    });

    client.on("error", (err) => {
        RedisConnection.connected = false;
        RedisConnection.lastErrorMessage = err.message;

        logger.error(`Redis Connection Error: ${err.message}`, {
            errorCode: err.code,
            errorName: err.name,
        });
    });

    client.on("ready", () => {
        logger.info("Redis client is ready to use");
        RedisConnection.connected = true;
    });

    client.on("end", () => {
        logger.info("Redis client connection has closed");
        RedisConnection.connected = false;
    });

    client.connect().catch((err) => {
        logger.error("Initial Redis Connection Failure", {
            errorMessage: err.message,
            config: JSON.stringify(redis_config),
        });
    });

    return client;
}

const redisClient = initializeRedisConnection();

module.exports = {
    RedisConnection,
    redisClient,
};
