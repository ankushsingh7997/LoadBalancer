const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const globalErrorHandler = require("../Utils/errorHandler");


const app = express();

const Test_Routes=require("../Routes/test_routes")
const Balancer_Routes=require("../Routes/balancer_route")
app.use(cors());
app.use(express.json());
app.use("/api/v1/healthCheck", (req, res) => {
    return res.status(200).json({
        status: true,
        message: "Health is OK",
    });
});


app.use("/api/v1",Test_Routes)
app.use("/api/v1/listener",Balancer_Routes)
app.all("*", (req, res, next) => {
    return res.status(404).json({ statue: false, message: "Path not found" });
});



app.use(globalErrorHandler);

module.exports = app;
