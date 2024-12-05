const express = require("express");
const LoadbalancerRouter = express.Router();
const balancer_controller = require("../Controllers/balancer_controller");
const { authorization } = require("../Middleware/authorization");
const api_logs = require("../Middleware/api");

LoadbalancerRouter.use(authorization);
LoadbalancerRouter.post("/create_user_listener", api_logs, balancer_controller.balanceLoad);

module.exports = LoadbalancerRouter;
