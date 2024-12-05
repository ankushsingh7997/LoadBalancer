const catchAsync = require("../Utils/catchAsync");

exports.test = catchAsync(async (req, res, next) => {
    return res.status(200).json({ status: true, message: "success" });
});
