const express = require('express');
const router = express.Router();
const {
  checkAvailability,
  createReservation,
  getMyReservations,
  getAllReservations,
  cancelReservation,
  updateReservation
} = require('../controllers/reservationController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate, reservationSchema } = require('../middleware/validator');

router.use(requireAuth);

router.get('/availability', checkAvailability);
router.get('/me', getMyReservations);
router.patch('/:id/cancel', cancelReservation);

router.route('/')
  .get(requireAdmin, getAllReservations)
  .post(validate(reservationSchema), createReservation);

router.route('/:id')
  .patch(requireAdmin, updateReservation);

module.exports = router;
