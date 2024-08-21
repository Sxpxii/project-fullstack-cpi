// routes/results.js
const express = require('express');
const router = express.Router();
const { compareAndCalculate, getResults  } = require('../controllers/resultsController');

router.get('/calculate/:materialType/:id', compareAndCalculate);
router.get('/:materialType/:id', getResults);

module.exports = router;
