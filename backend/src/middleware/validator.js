const { z } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    next();
  } catch (error) {
    const message = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    return res.status(422).json({ success: false, error: message });
  }
};

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    role: z.enum(['customer', 'admin']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
  }),
});

const tableSchema = z.object({
  body: z.object({
    tableNumber: z.number().int().positive({ message: 'Table number must be a positive integer' }),
    capacity: z.number().int().positive({ message: 'Capacity must be a positive integer' }).max(20, { message: 'Capacity cannot exceed 20' }),
  }),
});

const reservationSchema = z.object({
  body: z.object({
    table: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
    timeSlot: z.enum([
      '12:00-13:00',
      '13:00-14:00',
      '17:00-18:00',
      '18:00-19:00',
      '19:00-20:00',
      '20:00-21:00',
      '21:00-22:00'
    ], { message: 'Invalid time slot selected' }),
    guests: z.number().int().positive({ message: 'Guests must be at least 1' }).max(8, { message: 'Group size exceeds maximum table capacity (8 guests)' }),
  }).refine((data) => {
    const { date, timeSlot } = data;
    const now = new Date();
    
    // Format local date: YYYY-MM-DD in local time
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    
    if (date < todayStr) {
      return false; // date is in the past
    }
    
    if (date === todayStr) {
      const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
      const currentHour = now.getHours();
      // If today and current hour is past the slot start hour, reject
      if (currentHour >= slotStartHour) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Reservation date or time slot is in the past',
    path: ['date'],
  })
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  tableSchema,
  reservationSchema,
};
