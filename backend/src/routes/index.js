const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const syncRoutes = require('./sync.routes');
const mealRoutes = require('./meal.routes');
const familyRoutes = require('./family.routes');

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/meal-plan', mealRoutes);
router.use('/family', familyRoutes);

module.exports = router;
