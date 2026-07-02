require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Table = require('./models/Table');
const Reservation = require('./models/Reservation');
const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing database...');
    await User.deleteMany({});
    await Table.deleteMany({});
    await Reservation.deleteMany({});

    console.log('Seeding tables...');
    const tables = [
      { tableNumber: 1, capacity: 2 },
      { tableNumber: 2, capacity: 2 },
      { tableNumber: 3, capacity: 4 },
      { tableNumber: 4, capacity: 4 },
      { tableNumber: 5, capacity: 6 },
      { tableNumber: 6, capacity: 6 },
      { tableNumber: 7, capacity: 8 },
      { tableNumber: 8, capacity: 8 },
    ];
    await Table.create(tables);
    console.log('Tables seeded successfully!');

    console.log('Seeding users...');
    await User.create({
      name: 'Restaurant Manager',
      email: 'admin@tablesync.com',
      password: 'admin123',
      role: 'admin',
    });

    await User.create({
      name: 'John Doe',
      email: 'customer@tablesync.com',
      password: 'customer123',
      role: 'customer',
    });

    console.log('Users seeded successfully!');
    console.log('Seeded accounts:');
    console.log(`- Admin: admin@tablesync.com / admin123`);
    console.log(`- Customer: customer@tablesync.com / customer123`);

    mongoose.connection.close();
    console.log('Seeding completed. Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding data: ${error.message}`);
    process.exit(1);
  }
};

seedData();
