const os = require("os");
const fs = require("fs");
const winston = require("winston");
const Telegram = require("winston-telegram");
const { LOG_LEVELS, LEVEL } = require("../Consts/logger_constants");
const { SERVICE_NAME, NOTIFY_TELEGRAM_TOKEN, NOTIFY_TELEGRAM_CHAT_ID, connection } = require("../Env/env");
const MattermostTransport=require("./mattermost_transport")
const { get_current_date_time } = require("./time");
const DBTransport = require("./mongo_transport");
const path = require("path");

if (!fs.existsSync("./Logs")) {
    fs.mkdirSync("./Logs", { recursive: true });
}

function getInternalIp() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const interface of interfaces[interfaceName]) {
            if (interface.family === "IPv4" && !interface.internal) {
                return interface.address;
            }
        }
    }
    return null;
}

const internal_ip = getInternalIp();

const custom_format = winston.format.printf(({ level, message }) => {
    
    return `${get_current_date_time()} | ${level.toUpperCase()} | ${typeof message === "string" ? message : JSON.stringify(message)}`;
});
const mattermost_transport = new MattermostTransport({
    level: "notifylog",
    batch_size: 20,
    interval: 1000,
    template: `**${SERVICE_NAME.toUpperCase()}-${process.env.NODE_ENV}**\n{message}\n**INTERNAL IP** - ${internal_ip} ${connection}`,
});


const db_transport = new DBTransport();

const logger = winston.createLogger({
    levels: LOG_LEVELS,
    level: LEVEL,
    format: winston.format.combine(custom_format),
    transports: [new winston.transports.Console(), mattermost_transport, db_transport],
});




module.exports = {
    logger,
};
