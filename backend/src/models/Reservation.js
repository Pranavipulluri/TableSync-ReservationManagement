const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    date: {
      type: String,
      required: [true, 'Reservation date is required (YYYY-MM-DD)'],
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: props => `${props.value} is not a valid date format (YYYY-MM-DD)!`
      }
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      enum: {
        values: [
          '12:00-13:00',
          '13:00-14:00',
          '17:00-18:00',
          '18:00-19:00',
          '19:00-20:00',
          '20:00-21:00',
          '21:00-22:00'
        ],
        message: '{VALUE} is not a valid time slot'
      }
    },
    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Number of guests must be at least 1']
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    }
  },
  {
    timestamps: true,
  }
);

// Concurrency guard: A table can only have one confirmed reservation per date and time slot.
// Cancelled reservations are excluded, allowing that slot to be booked again.
ReservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

// Admin filtering index: Optimizes the frequent "view all reservations by date" query.
ReservationSchema.index({ date: 1 });

module.exports = mongoose.model('Reservation', ReservationSchema);
