const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },  // Add fullname field
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true }, // Add this field
 // Merchant fields
 merchantName: { type: String },  // Merchant name
 merchantType: { type: String },  // Merchant type
 

year: {
  type: String,
  required: function () {
    return this.role === 'student';
  }
},


    // Link to student if user is a parent
    studentIDs: {
      type: [String],
      default: [],
      required: function () {
        return this.role === 'parent';
      }
    },

    
    

    walletID: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: false },  // This will store the user's wallet

    items: [
      {
        name: String,
        quantity: Number,
        sold: { type: Number, default: 0 },
        costPrice: Number,
        sellingPrice: Number,
        category: String,
        imageUrl: String
      }
    ],
    
    
    role: {
      type: String,
      enum: ['student', 'parent', 'admin', 'teacher', 'merchant', 'dean', 'vice_dean','secretary'],
      default: 'student'
    },

    faculty: {
      type: String,
      required: function () {
        return ['student', 'dean', 'vice_dean', 'secretary'].includes(this.role);
      }
    },
    studentData: {
      enrolledCourses: {
        type: [String],
        default: []
      }
    },
    

  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },

  userId: {
    type: String,
    unique: true,
    sparse: true
  },

 

}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // Only hash if password is changed
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Verify password
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
