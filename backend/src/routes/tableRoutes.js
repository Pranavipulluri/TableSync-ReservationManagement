const express = require('express');
const router = express.Router();
const { createTable, getTables, deleteTable } = require('../controllers/tableController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate, tableSchema } = require('../middleware/validator');

router.use(requireAuth);

router.route('/')
  .get(getTables)
  .post(requireAdmin, validate(tableSchema), createTable);

router.delete('/:id', requireAdmin, deleteTable);

module.exports = router;
