import mongoose from 'mongoose';
import addressSchema from '#account/Address.model.js';


const accountSchema = new mongoose.Schema({
   name: {
      type: String,
      required: [true, 'Vui lòng nhập tên'],
      trim: true
   },

   email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true
   },

   password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: 6
   },

   avatar: {
      type: String,
      default: ''
   },

   phone: {
      type: String,
      unique: true,
      sparse: true,
   },

   googleId: {
      type: String,
      unique: true,
      sparse: true,
   },

   address: [addressSchema],

   role: {
      type: String,
      enum: ['user', 'admin', 'staff'],
      default: 'user'
   }, // Quyen nguoi dung

   membershipLevel: {
      type: String,
      enum: ['Tiêu chuẩn', 'Bạc', 'Vàng', 'Kim cương'],
      default: 'Tiêu chuẩn'
   }, // Mạc định là tiêu chuan

   // Các trường phục vụ xác thực OTP
   isVerified: { type: Boolean, default: false }, // Mặc định chưa xác thực
   otpCode: { type: String, default: null },
   otpExpires: { type: Date, default: null },

   isDeleted: {
      type: Boolean,
      default: false
   }, // Mạc định chưa xóa
   deletedAt: {
      type: Date,
      default: null
   } //  Ngày xóa
}, { 
   timestamps: true,
   toJSON: { virtuals: true },
   toObject: { virtuals: true }
});

// Định nghĩa virtual orderHistory liên kết với Model Order
accountSchema.virtual('orderHistory', {
   ref: 'Order',
   localField: '_id',
   foreignField: 'user'
});

// Khi trường `deletedAt` có giá trị, MongoDB sẽ tự động xóa cứng bản ghi này sau 60 ngày.
accountSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 5184000 });

const Account = mongoose.model('Account', accountSchema);
export default Account;