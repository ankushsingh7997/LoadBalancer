const axios = require("axios");
const { logger } = require("./logger");

const requestHandler = async ({
    method = "get",
    url,
    payload = null,
    headers = {},
    contentType = "application/json",
    user,
    service,
    actid = null,
}) => {
    const startTime = Date.now();
    const requestDetails = {
        method,
        payload,
        headers: {
            "Content-Type": contentType,
            ...headers,
        },
        url,
        start_time: startTime,
        user,
        service,
        actid,
    };

    try {
        const response = await axios.request({
            method,
            url,
            data: payload,
            headers: requestDetails.headers,
            timeout: 7000,
        });

        requestDetails.time_taken = Date.now() - startTime;
        requestDetails.response = response.data;
        requestDetails.status = true;
        logger.request(requestDetails);

        return {
            status: true,
            response: response.data,
            message: "Response Received Successfully",
        };
    } catch (error) {
        const errorTypes = {
            ECONNABORTED: "Connection Timeout",
            RESPONSE: "Response Received Successfully",
            NO_RESPONSE: "No Response Received",
            UNKNOWN: "Something Went Very Wrong",
        };

        const errorType = error.code || (error.response ? "RESPONSE" : error.request ? "NO_RESPONSE" : "UNKNOWN");
        const message = errorTypes[errorType] || errorTypes.UNKNOWN;

        if (errorType !== "RESPONSE") {
            requestDetails.time_taken = null;
            requestDetails.response = errorTypes[errorType];
            const logMessage = JSON.stringify(requestDetails);
            logger.notify(`Error Occurred in Sending Request.\n${logMessage}`);
            if (errorType === "UNKNOWN") {
                logger.error({
                    message: error.message,
                    error_function: "requestHandler",
                    service,
                    user,
                    actid,
                });
            }
        } else {
            requestDetails.response = error.response.data;
        }

        requestDetails.status = false;
        requestDetails.error_code = error.code ? error.code : "UNKNOWN/NORESPONSE";
        requestDetails.msg = message;
        logger.db(requestDetails);

        return {
            status: errorType === "RESPONSE",
            response: error.response?.data || {},
            message,
        };
    }
};

module.exports = requestHandler;
