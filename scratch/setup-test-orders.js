import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const mongoUri = process.env.MONGODB_CONNECTION_STRING;

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  // Hash password '123456'
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Update users to have password '123456' and make sure they are verified
  const userEmails = ['nvhhoang1@gmail.com', 'user1@gmail.com'];
  for (const email of userEmails) {
    const res = await mongoose.connection.db.collection('accounts').updateOne(
      { email },
      { $set: { password: hashedPassword, isVerified: true } }
    );
    console.log(`Updated user ${email}:`, res);
  }

  // Get user ID for nvhhoang1@gmail.com
  const user = await mongoose.connection.db.collection('accounts').findOne({ email: 'nvhhoang1@gmail.com' });
  const userId = user._id;

  // Let's modify nvhhoang1@gmail.com's orders to test the 3 states:
  // 1. Order 1: Đã giao, chưa nhận, trong vòng 7 ngày (deliveredAt = 2 days ago)
  // 2. Order 2: Đã giao, chưa nhận, quá 7 ngày (deliveredAt = 10 days ago)
  // 3. Order 3: Đang giao hoặc Chờ xác nhận (để test hủy đơn)
  
  const orders = await mongoose.connection.db.collection('orders').find({ user: userId }).toArray();
  console.log(`Found ${orders.length} orders for nvhhoang1@gmail.com`);

  if (orders.length >= 3) {
    // Modify Order 0: Delivered 2 days ago, isReceived = false
    const date2DaysAgo = new Date();
    date2DaysAgo.setDate(date2DaysAgo.getDate() - 2);
    
    await mongoose.connection.db.collection('orders').updateOne(
      { _id: orders[0]._id },
      { 
        $set: { 
          orderStatus: 'Đã giao', 
          isDelivered: true,
          deliveredAt: date2DaysAgo,
          isReceived: false,
          receivedAt: null
        } 
      }
    );
    console.log(`Updated Order 1 (${orders[0]._id}) to status: Đã giao, deliveredAt: 2 days ago, isReceived: false`);

    // Modify Order 1: Delivered 10 days ago, isReceived = false
    const date10DaysAgo = new Date();
    date10DaysAgo.setDate(date10DaysAgo.getDate() - 10);

    await mongoose.connection.db.collection('orders').updateOne(
      { _id: orders[1]._id },
      { 
        $set: { 
          orderStatus: 'Đã giao', 
          isDelivered: true,
          deliveredAt: date10DaysAgo,
          isReceived: false,
          receivedAt: null
        } 
      }
    );
    console.log(`Updated Order 2 (${orders[1]._id}) to status: Đã giao, deliveredAt: 10 days ago (should only show Review button), isReceived: false`);

    // Modify Order 2: Chờ xác nhận (for testing order cancellation)
    await mongoose.connection.db.collection('orders').updateOne(
      { _id: orders[2]._id },
      { 
        $set: { 
          orderStatus: 'Chờ xác nhận',
          isDelivered: false,
          deliveredAt: null,
          isReceived: false,
          receivedAt: null
        } 
      }
    );
    console.log(`Updated Order 3 (${orders[2]._id}) to status: Chờ xác nhận`);
  } else {
    console.log('Not enough existing orders to configure all scenarios. We might need to create mock orders.');
  }

  await mongoose.connection.close();
  console.log('Done!');
}

run().catch(console.error);
