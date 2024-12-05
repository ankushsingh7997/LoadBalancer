module.exports = (err, req, res, next) => {
    return res.status(500).json({
        status: false,
        message: "Error Occured Check Logs",
    });
};
const appError = require("./appError");
const { ENVIRONMENT } = require("../Env/env");
const { logger } = require("./logger");

const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const handleCasteErrorDB = (err) => {
    const message = `Invalid ${err.path}:${err.value}.`;
    return new appError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    let value = err.errmsg.match(/dup key: { ([^{}]+) }/);
    let message = "";
    if (value) {
        let keyValueString = value[1];
        let formattedString = `{${keyValueString.replace(/(\w+):/g, '"$1":')}}`;
        let keyValueObject = JSON.parse(formattedString);
        for (const key in keyValueObject) {
            if (key === "user") continue;
            message += `${capitalize(key.split("_").join(" "))} (${keyValueObject[key]}) already used. Please use another ${capitalize(
                key.split("_").join(" ")
            )} `;
        }
    }
    return new appError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((ele) => ele.message);
    const message = `${errors.join(". ")}`;
    return new appError(message, 400);
};

const send_error = (err, res) => {
    if (err.is_operational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            errStack: ENVIRONMENT !== "PRODUCTION" ? err.stack : "none",
        });
    } else {
        logger.notify(`Error has occured in application!! This is global error handler speaking!!\n${JSON.stringify(err)}`);
        logger.error(err);
        return res.status(500).json({
            status: false,
            message: "Something went wrong!!",
            errStack: ENVIRONMENT !== "PRODUCTION" ? err.stack : "none",
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = false;
    let error = { ...err };
    error.message = err.message;
    if (err.name === "CastError") {
        error = handleCasteErrorDB(err);
        return send_error(error, res);
    }
    if (err.code === 11000) {
        error = handleDuplicateFieldsDB(err);
        return send_error(error, res);
    }
    if (err.name === "ValidationError") {
        error = handleValidationErrorDB(err);
        return send_error(error, res);
    }
    return send_error(error, res);
};
