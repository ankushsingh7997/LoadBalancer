const { getMasterInstanceId, getClientInstanceId } = require("../AWS/server_management");
const catchAsync = require("../Utils/catchAsync");
const http = require("http");
const AppError = require("../Utils/appError");
const stateManager = require("../StateManagement/stateManager");

const validateBody = (body) => {
    const requiredFields = ["actid", "broker", "access_token", "master_actid", "services"];
    const missingFields = [];

    requiredFields.forEach((field) => {
        if (field === "actid") {
            if (!(field in body) || !body[field] || body[field].toString().trim() === "") {
                missingFields.push(field);
            }
        } else {
            if (!(field in body)) {
                missingFields.push(field);
            }
        }
    });

    if (body.services && body.services.master === false) {
        if (!body.master_actid || body.master_actid.toString().trim() === "") {
            return {
                isValid: false,
                message: "master_actid is required when services.master is false",
            };
        }
    }

    if (missingFields.length > 0) {
        return {
            isValid: false,
            message: `Required fields missing: ${missingFields.join(", ")}`,
        };
    }
    return { isValid: true };
};

exports.balanceLoad = catchAsync(async (req, res, next) => {
    if (!req.body) {
        return next(new AppError("No request body provided", 400));
    }
    const validationResult = validateBody(req.body);
    if (!validationResult.isValid) {
        return next(new AppError(validationResult.message, 400));
    }
    let instanceId;
    if (req.body?.services?.master) {
        instanceId = await getMasterInstanceId(req.body);
    } else {
        instanceId = await getClientInstanceId(req.body);
    }

    if (!instanceId) {
        return next(new AppError("Could not find suitable instance", 500));
    }

    const instanceIp = stateManager.state.instanceIPs.get(instanceId);
    if (!instanceIp) {
        return next(new AppError(`No IP found for instance ${instanceId}`, 500));
    }

    const options = {
        hostname: instanceIp,
        path: "/api/v1/listener/create_user_listener",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };

    const proxyRequest = http.request(options, (proxyRes) => {
        // Pipe response back to original client
        proxyRes.pipe(res);
    });

    proxyRequest.on("error", (error) => {
        next(new AppError(`Proxy request failed: ${error.message}`, 500));
    });

    proxyRequest.write(JSON.stringify(req.body));
    proxyRequest.end();
});
