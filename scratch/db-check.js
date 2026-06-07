import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

const mongoUri = process.env.MONGODB_CONNECTION_STRING;

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  // Check Account collection
  const accounts = await mongoose.connection.db.collection('accounts').find({}).toArray();
  console.log(`Found ${accounts.length} accounts:`);
  accounts.forEach(acc => {
    console.log(`- ID: ${acc._id}, Name: ${acc.name}, Email: ${acc.email}, Role: ${acc.role}`);
  });

  // Check Branch collection
  const branches = await mongoose.connection.db.collection('branches').find({}).toArray();
  console.log(`\nFound ${branches.length} branches:`);
  branches.forEach(b => {
    console.log(`- ID: ${b._id}, Name: ${b.name}`);
  });

  // Check Product collection
  const products = await mongoose.connection.db.collection('products').find({}).limit(5).toArray();
  console.log(`\nFound products (limit 5):`);
  products.forEach(p => {
    console.log(`- ID: ${p._id}, Name: ${p.name}, Price: ${p.price}`);
  });

  // Check Orders
  const orders = await mongoose.connection.db.collection('orders').find({}).limit(5).toArray();
  console.log(`\nFound orders (limit 5):`);
  orders.forEach(o => {
    console.log(`- ID: ${o._id}, User: ${o.user}, Status: ${o.orderStatus}, Total: ${o.totalPrice}`);
  });

  await mongoose.connection.close();
  console.log('Done!');
}

run().catch(console.error);
