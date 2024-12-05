const { AUTHORIZATION_TOKEN } = require("../Env/env")

exports.authorization = (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            status: false, 
            message: "Unauthorized: Bearer token required"
        });
    }
    const token = req.headers.authorization.split(" ")[1];
    if (token !== AUTHORIZATION_TOKEN) {
        return res.status(403).json({
            status: false, 
            message: "Forbidden: Invalid token"
        });
    }

    next();
}