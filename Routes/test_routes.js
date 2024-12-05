const express = require("express");
const Router = express.Router();
const test_controller=require("../Controllers/test_controller")
const api_log = require("../Middleware/api");

Router.get("/test", api_log, test_controller.test);

module.exports = Router;
