const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/pull', authMiddleware, syncController.pull);
router.post('/push', authMiddleware, syncController.push);

module.exports = router;
