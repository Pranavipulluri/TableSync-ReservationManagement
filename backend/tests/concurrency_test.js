const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Table = require('../src/models/Table');
const Reservation = require('../src/models/Reservation');

const runConcurrencyTest = async () => {
  console.log('--- Starting Database Concurrency Race Condition Test ---');
  
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to isolated MongoMemoryServer.');

  try {
    const table = await Table.create({ tableNumber: 1, capacity: 4 });
    const user1 = await User.create({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
    const user2 = await User.create({ name: 'Bob', email: 'bob@test.com', password: 'password123' });
    console.log('Fixtures created: Table 1 (capacity 4), User Alice, User Bob.');

    const reservationData1 = {
      table: table._id,
      user: user1._id,
      date: '2026-07-04',
      timeSlot: '18:00-19:00',
      guests: 2,
      status: 'confirmed'
    };

    const reservationData2 = {
      table: table._id,
      user: user2._id,
      date: '2026-07-04',
      timeSlot: '18:00-19:00',
      guests: 3,
      status: 'confirmed'
    };

    console.log('Simulating 2 simultaneous booking requests for Table 1, 2026-07-04, 18:00-19:00...');

    // Trigger parallel save requests
    const resPromise1 = new Reservation(reservationData1).save();
    const resPromise2 = new Reservation(reservationData2).save();

    const results = await Promise.allSettled([resPromise1, resPromise2]);

    console.log('\n--- Test Results ---');
    results.forEach((r, idx) => {
      const name = idx === 0 ? 'Alice (Request 1)' : 'Bob (Request 2)';
      if (r.status === 'fulfilled') {
        console.log(`${name}: SUCCESS - Reservation saved. ID: ${r.value._id}`);
      } else {
        console.log(`${name}: FAILED - Error: ${r.reason.message}`);
        console.log(`  Error Code: ${r.reason.code}`);
        console.log(`  Is Duplicate Key Error (11000): ${r.reason.code === 11000}`);
      }
    });

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected' && r.reason.code === 11000).length;

    console.log('\n--- Summary ---');
    console.log(`Successful Bookings: ${successCount} (Expected: 1)`);
    console.log(`Duplicate Key Failures: ${failCount} (Expected: 1)`);

    if (successCount === 1 && failCount === 1) {
      console.log('STATUS: SUCCESS. Database index successfully blocked the race condition!');
    } else {
      console.log('STATUS: FAILED. Concurrency control did not work as expected.');
    }

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Connection closed. Test environment cleaned up.');
  }
};

runConcurrencyTest();
