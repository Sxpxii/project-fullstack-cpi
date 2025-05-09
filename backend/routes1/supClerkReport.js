const express = require("express");
const router = express.Router();
const { getDetailsReports } = require("../controllers1/supClerkReportController");

router.get("/requests-reports", getDetailsReports);

module.exports = router;
