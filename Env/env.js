const { RouteTableAssociationStateCode } = require("@aws-sdk/client-ec2");
const dotenv = require("dotenv");
const fs = require("fs");
const env_file = `.env.${process.env.NODE_ENV?.trim()}`;

if (fs.existsSync(env_file)) {
    dotenv.config({ path: env_file });
} else {
    console.log(`${process.env.NODE_ENV ? process.env.NODE_ENV + "file is missing" : "No environment configured"} , loading default file`);
    dotenv.config();
}

exports.SERVICE_NAME = process.env.SERVICE_NAME.trim();

// - Server Configs
exports.PORT = process.env.PORT.trim();

// - Monitoring and Logging
exports.LOG_DB_URI = process.env.LOG_DB_URI.trim();
exports.LOG_DB_NAME = process.env.LOG_DB_NAME.trim();
exports.LOG_COLLECTION_NAME = "logs";

// - Telegram
exports.NOTIFY_TELEGRAM_TOKEN = process.env.NOTIFY_TELEGRAM_TOKEN.trim();
exports.NOTIFY_TELEGRAM_CHAT_ID = process.env.NOTIFY_TELEGRAM_CHAT_ID.trim();

// - State
exports.STATE_PATH = "./StateData/state.json";

// - Redis configurations
exports.REDIS_NAME = process.env.REDIS_NAME.trim();
exports.REDIS_HOST_URL = process.env.REDIS_HOST_URL.trim();
exports.REDIS_PORT = process.env.REDIS_PORT.trim();
exports.REDIS_PASSWORD = process.env.REDIS_PASSWORD.trim();

//  - Service Url

// - Mattermost
exports.MATTERMOST_BOT_TOKEN = process.env.MATTERMOST_BOT_TOKEN.trim();
exports.LOGS_CHANNEL = process.env.LOGS_CHANNEL.trim();
exports.ERROR_CHANNEL = process.env.ERROR_CHANNEL.trim();
exports.credentials = {
    accessKeyId: process.env.ACCESSKEY.trim(),
    secretAccessKey: process.env.SECRET.trim(),
};
exports.SERVER_CONFIG = {
    ami_id: process.env.AMI_ID.trim(),
    instance_type: process.env.INSTANCE_TYPE.trim(),
    keyname: process.env.KEYNAME.trim(),
    role: process.env.ROLE.trim(),
    security_group: process.env.SECURITY_GROUP.trim(),
    subnet_id: process.env.SUBNET_ID.trim(),
};

exports.CONFIG = {
    INITIAL_INSTANCE: parseInt(process.env.INITIAL_INSTANCE.trim(), 10),
    MAX_USERS_PER_CLIENT_INSTANCE: parseInt(process.env.MAX_USERS_PER_CLIENT_INSTANCE.trim(), 10),
    MAX_USER_PER_MASTER_INSTANCE: parseInt(process.env.MAX_USER_PER_MASTER_INSTANCE.trim(), 10),
    SCALING_THRESHOLD_CLIENT: parseInt(process.env.SCALING_THRESHOLD_CLIENT.trim(), 10),
    SCALING_THRESHOLD_MASTER: parseInt(process.env.SCALING_THRESHOLD_MASTER.trim(), 10),
    REGION: process.env.REGION.trim(),
    START_HEALTH_MANAGER: parseInt(process.env.START_HEALTH_MANAGER.trim(), 10),
};

exports.AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN.trim();
