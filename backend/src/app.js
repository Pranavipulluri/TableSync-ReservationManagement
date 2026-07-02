const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const tableRoutes = require('./routes/tableRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Setup Morgan logging with request ID
morgan.token('id', (req) => req.id);
app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms'));

// Configure CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
if (process.env.FRONTEND_URL) {
  const cleanUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
  allowedOrigins.push(cleanUrl);
  allowedOrigins.push(cleanUrl + '/');
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.startsWith('http://localhost:') || 
                      origin.endsWith('.vercel.app');
                      
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);

// Root test route
app.get('/', (req, res) => {
  res.json({ message: 'TableSync API is running' });
});

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
