const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Table = require('../src/models/Table');
const Reservation = require('../src/models/Reservation');
const jwt = require('jsonwebtoken');

let mongoServer;
let customerToken;
let adminToken;
let customerUser;
let adminUser;
let table1; // capacity 2
let table2; // capacity 4
let table3; // capacity 8

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Table.deleteMany({});
  await Reservation.deleteMany({});

  // Seed test tables
  table1 = await Table.create({ tableNumber: 1, capacity: 2 });
  table2 = await Table.create({ tableNumber: 2, capacity: 4 });
  table3 = await Table.create({ tableNumber: 3, capacity: 8 });

  // Seed users
  customerUser = await User.create({
    name: 'Customer User',
    email: 'customer@test.com',
    password: 'password123',
    role: 'customer'
  });

  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  });

  const secret = process.env.JWT_SECRET || 'supersecretkey123';
  customerToken = 'Bearer ' + jwt.sign({ id: customerUser._id }, secret);
  adminToken = 'Bearer ' + jwt.sign({ id: adminUser._id }, secret);
});

describe('Reservation System Tests', () => {
  const getTomorrowDateStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  describe('Validation Rules', () => {
    it('should reject guest counts <= 0', async () => {
      const tomorrow = getTomorrowDateStr();
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 0
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Guests must be at least 1');
    });

    it('should reject guest counts exceeding maximum capacity (8)', async () => {
      const tomorrow = getTomorrowDateStr();
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 9
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('exceeds maximum table capacity');
    });

    it('should reject reservations for dates in the past', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: '2020-01-01',
          timeSlot: '18:00-19:00',
          guests: 2
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('past');
    });
  });

  describe('Core Booking and Concurrency Control', () => {
    it('should successfully book a table if available', async () => {
      const tomorrow = getTomorrowDateStr();
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.table._id).toBe(table1._id.toString());
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should prevent double booking the same table, date, and slot (409 Conflict)', async () => {
      const tomorrow = getTomorrowDateStr();
      
      const res1 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toContain('already reserved');
    });

    it('should auto-assign the smallest available table that fits guest size', async () => {
      const tomorrow = getTomorrowDateStr();

      const res1 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.table.tableNumber).toBe(1);

      const res2 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2
        });
      expect(res2.status).toBe(201);
      expect(res2.body.data.table.tableNumber).toBe(2);
    });

    it('should allow re-booking a slot if the original reservation is cancelled', async () => {
      const tomorrow = getTomorrowDateStr();

      const res1 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });
      const reservationId = res1.body.data._id;

      const res2 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });
      expect(res2.status).toBe(409);

      const resCancel = await request(app)
        .patch(`/api/reservations/${reservationId}/cancel`)
        .set('Authorization', customerToken);
      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.status).toBe('cancelled');

      const res3 = await request(app)
        .post('/api/reservations')
        .set('Authorization', customerToken)
        .send({
          date: tomorrow,
          timeSlot: '18:00-19:00',
          guests: 2,
          table: table1._id.toString()
        });
      expect(res3.status).toBe(201);
    });
  });

  describe('Authorization Rules', () => {
    it('should reject admin operations when called by customer', async () => {
      const res = await request(app)
        .get('/api/reservations')
        .set('Authorization', customerToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Administrators only');
    });

    it('should allow admin operations when called by admin', async () => {
      const res = await request(app)
        .get('/api/reservations')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
