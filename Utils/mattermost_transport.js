const winston = require("winston");
const axios = require("axios");
const { MATTERMOST_BOT_TOKEN, LOGS_CHANNEL, ERROR_CHANNEL } = require("../Env/env");
const shutdown_handler = require("./shutdown_handler");
const { get_current_date_time } = require("./time");

let mattermost_message_separtor = "\n\n---";
let same_message_separtor = "\n\n---\n\n";

const send_mattermost_notification = async ({ message, log = false }) => {
    // message=typeof message==="string"?message:JSON.stringify(message)
   
  
    try {
        let channel_id = log ? LOGS_CHANNEL : ERROR_CHANNEL;
        let tag="@all"
        let axios_config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://mattermost.algowiz.in/api/v4/posts",
            headers: {
                Authorization: `Bearer ${MATTERMOST_BOT_TOKEN}`,
            },
            data: {
                channel_id,
                message: `${tag}\n\n${message}${mattermost_message_separtor}`,
            },
        };
        let response = await axios.request(axios_config);
    } catch (err) {
        console.log(err);
    }
};

class Mattermost extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.logs = [];
        this.allowed_level = ["notify", "error"];
        this.template = opts.template;
        this.batch_size = opts.batch_size;
        this.interval = opts.interval;
        this.bactch_logs();
        shutdown_handler.registerCleanupFunction(() => this.empty_logs());
    }

    empty_logs() {
        console.log(`${get_current_date_time()} | INFO | Clearing Logs, shutdown signal received`);
        if (!this.logs.length) return;
        let logs_array = this.logs;
        let out_message = "";
        let not_message = "";
        for (let i = 0; i < logs_array.length; i++) {
            logs_array[i].level === "error"
                ? (not_message = `${not_message}${logs_array[i].message}${same_message_separtor}`)
                : (out_message = `${out_message}${logs_array[i].message}${same_message_separtor}`);
        }

        if (out_message.length) {
            send_mattermost_notification({ message: out_message, log: true });
        }
        if (not_message.length) {
            send_mattermost_notification({ message: not_message, log: false });
        }
    }

    bactch_logs() {
        setInterval(() => {
            if (!this.logs.length) return;
            let logs_array = this.logs.splice(0, this.batch_size);
            let out_message = "";
            let not_message = "";
            for (let i = 0; i < logs_array.length; i++) {
                logs_array[i].level === "error"
                    ? (not_message = `${not_message}${logs_array[i].message}${same_message_separtor}`)
                    : (out_message = `${out_message}${logs_array[i].message}${same_message_separtor}`);
            }
            if (out_message.length) {
               
                send_mattermost_notification({ message: out_message, log: true });
            }
            if (not_message.length) {
                send_mattermost_notification({ message: not_message, log: false });
            }
        }, this.interval);
    }

    log(info, callback) {
        setImmediate(() => this.emit("logged", info));

        if (!this.allowed_level.includes(info.level)) return callback();
        let additionalInfo = null;
        const symbols = Object.getOwnPropertySymbols(info);
        const spladSymbol = symbols.find(sym => sym.description === 'splat');
        if (spladSymbol) {
            additionalInfo = info[spladSymbol] && info[spladSymbol][0];
        }

        let fullMessage = typeof info.message==="string"?info.message:JSON.stringify(info.message);
        if (additionalInfo && typeof additionalInfo === 'object') {
            fullMessage += `\n\nAdditional Error Details:\n${JSON.stringify(additionalInfo, null, 2)}`;
        }
        const messageTemplate = `${info[Symbol('message')]}\n\n${fullMessage}`;
        this.logs.push({ 
            message: messageTemplate, 
            level: info.level 
        });
    
        callback();
    }
}

module.exports = Mattermost;