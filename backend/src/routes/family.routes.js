const express = require('express');
const router = express.Router();
const familyController = require('../controllers/family.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/update-action', authMiddleware, familyController.handleAction);

module.exports = router;
