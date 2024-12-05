const TransportStream = require("winston-transport");
const { MongoClient } = require("mongodb");
const { SERVICE_NAME, LOG_DB_URI, LOG_DB_NAME, LOG_COLLECTION_NAME } = require("../Env/env");
const { get_current_date_time, get_current_time, get_current_date } = require("./time");
const { LOG_LEVELS, LOG_BATCH_SIZE, LOG_INTERVAL } = require("../Consts/logger_constants");
const shutdown_handler = require("./shutdown_handler");
const { send_notification } = require("./notification_sender");

const is_plain_object = (obj) => {
    return obj != null && typeof obj === "object" && obj.constructor === Object;
};

class DBTransport extends TransportStream {
    constructor() {
        let opts = {
            level: "db",
            dbUri: LOG_DB_URI,
            dbName: LOG_DB_NAME,
            batchSize: LOG_BATCH_SIZE,
            interval: LOG_INTERVAL,
        };
        super(opts);
        this.level = "db";
        this.db_uri = LOG_DB_URI;
        this.db_name = LOG_DB_NAME;
        this.collection_name = LOG_COLLECTION_NAME;
        this.batch_size = LOG_BATCH_SIZE;
        this.interval = LOG_INTERVAL; // 5 seconds
        this.logs = [];
        this.client = undefined;
        this.initDB();
        this.startBatchWriter();
        shutdown_handler.registerCleanupFunction(() => this.closeConnection(),true);
    }

    async initDB() {
        try {
            this.client = new MongoClient(this.db_uri);
            await this.client.connect();
            this.db = this.client.db(this.db_name);
            this.collection = this.db.collection(this.collection_name);
            console.log(`${get_current_date_time()} | INFO | LOG DATABASE Connected`);
        } catch (err) {
            // send_notification("ERROR IN CONNECTING TO LOG DATABASE!");
            console.error(`${get_current_date_time()} | ERROR | Error in Connecting to Mongodb : `, err);
        }
    }

    async empty_log_list() {
        if (!this.collection) return;
        if (this.logs.length > 0) {
            try {
                const logsToWrite = this.logs;
                this.logs = [];
                await this.collection.insertMany(logsToWrite);
            } catch (err) {
                send_notification("ERROR IN ADDING TO LOGS!");
                console.log(this.logs.splice(0, this.batch_size));
                console.error(`${get_current_date_time()} | ERROR | Error in Adding Log to Database : `, err);
            }
        }
    }

    async send_to_db() {
        if (!this.collection) return;
        if (this.logs.length > this.batch_size) {
            try {
                const logsToWrite = this.logs.splice(0, this.batch_size);
                await this.collection.insertMany(logsToWrite);
            } catch (err) {
                send_notification("ERROR IN ADDING TO LOGS!");
                console.log(this.logs.splice(0, this.batch_size));
                console.error(`${get_current_date_time()} | ERROR | Error in Adding Log to Database : `, err);
            }
        }
    }

    async startBatchWriter() {
        setInterval(async () => {
            if (!this.collection) return;
            if (this.logs.length > 0) {
                try {
                    const logsToWrite = this.logs.splice(0, this.batch_size);
                    await this.collection.insertMany(logsToWrite);
                } catch (err) {
                    send_notification("ERROR IN ADDING TO LOGS!");
                    console.log(this.logs.splice(0, this.batch_size));
                    console.error(`${get_current_date_time()} | ERROR | Error in Adding Log to Database : `, err);
                }
            }
        }, this.interval);
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit("logged", info);
        });

        try {
            if (info.level !== "notify") {
                let object_to_log = {
                    level: info.level,
                    level_no: LOG_LEVELS["db"] - LOG_LEVELS[info.level],
                    date: get_current_date(),
                    time: get_current_time(),
                    timestamp: Date.now(),
                    microservice: SERVICE_NAME,
                };
                if (is_plain_object(info.message)) {
                    object_to_log = { ...object_to_log, ...info.message };
                } else {
                    object_to_log.msg = info.message;
                }

                this.logs.push(object_to_log);
            }
        } catch (err) {
            send_notification("ERROR WHILE PUSHING LOGS TO BATCH");
            console.error(`${get_current_date_time()} | ERROR | Error in pushing to log queue : `, err);
        }
        this.send_to_db();
        callback();
    }
    async closeConnection() {
        if (this.client) {
            try {
                await this.empty_log_list();
                await this.client.close();
                console.log(`${get_current_date_time()} | INFO | LOG DATABASE Connection Closed`);
            } catch (err) {
                await send_notification("ERROR WHILE CLOSING CONNECTION");
                console.error(`${get_current_date_time()} | ERROR | Error in Closing MongoDB Connection: `, err);
            }
        }
    }
}

module.exports = DBTransport;
