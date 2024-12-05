const fs = require("fs");
const { STATE_PATH } = require("../Env/env");
const { logger } = require("../Utils/logger");
const shutdown_handler = require("../Utils/shutdown_handler");

let state_data = {};

try {
    if (fs.existsSync(STATE_PATH)) {
        let data = fs.readFileSync(STATE_PATH);
        state_data = JSON.parse(data);
    } else {
        logger.info(`No Previous State Found`);
    }
} catch (err) {
    logger.notify("Error in Getting Previous State");
    logger.error(err);
}

exports.add_variable_to_state = (key, data) => {
    state_data[key] = data;
    console.log(state_data);
};

exports.get_variable_from_state = (key, default_value) => {
    if (key in state_data) {
        return state_data[key];
    }
    return default_value;
};

const save_state_data = async () => {
    try {
        logger.info(`Saving State Data!`);

        const dirPath = STATE_PATH

        if (!fs.existsSync(dirPath)) {
            console.log("creating statefile directory");
            fs.mkdirSync("./StateData", { recursive: true });
        }

        fs.writeFileSync(dirPath, JSON.stringify(state_data));
    } catch (err) {
        logger.notify("Error in Saving State Data and cleaning up Redis!!");
        console.log(err);
        logger.error(err);
    }
};

shutdown_handler.registerCleanupFunction(save_state_data);
