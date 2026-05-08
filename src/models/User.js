const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: 8,
      select:   false, // never returned in queries by default
    },

    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },

    plan: {
      type:    String,
      enum:    ['free', 'pro', 'enterprise'],
      default: 'free',
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps:  true,  // adds createdAt and updatedAt automatically
    versionKey:  false,
  }
);

// ── Hash password before saving ────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Compare password method ────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Never return password in JSON responses ────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);