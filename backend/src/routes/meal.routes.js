const express = require('express');
const router = express.Router();
const mealController = require('../controllers/meal.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/validate', authMiddleware, mealController.validate);

module.exports = router;
