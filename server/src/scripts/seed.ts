import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User, UserRole } from '../models/User';
import mongoose from 'mongoose';

dotenv.config();

const seedUsers = [
  {
    fullName: 'Customer Demo',
    email: 'customer@queueless.dev',
    phone: '+15550000001',
    password: 'Password123!',
    role: 'customer' as UserRole,
  },
  {
    fullName: 'Staff Operator',
    email: 'staff@queueless.dev',
    phone: '+15550000002',
    password: 'Password123!',
    role: 'staff' as UserRole,
  },
  {
    fullName: 'Org Admin',
    email: 'admin@queueless.dev',
    phone: '+15550000003',
    password: 'Password123!',
    role: 'organization_admin' as UserRole,
  },
  {
    fullName: 'System Super Admin',
    email: 'superadmin@queueless.dev',
    phone: '+15550000004',
    password: 'Password123!',
    role: 'super_admin' as UserRole,
  },
];

export const runSeed = async () => {
  await connectDB();
  console.log('[Seed] Seeding development accounts...');

  for (const u of seedUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await User.create({
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: u.role,
        isEmailVerified: true,
        isActive: true,
      });
      console.log(`[Seed] Created ${u.role} account: ${u.email}`);
    } else {
      console.log(`[Seed] User already exists: ${u.email}`);
    }
  }

  console.log('\n========================================');
  console.log('DEVELOPMENT SEED CREDENTIALS:');
  console.log('Customer:           customer@queueless.dev   / Password123!');
  console.log('Staff:              staff@queueless.dev      / Password123!');
  console.log('Organization Admin: admin@queueless.dev      / Password123!');
  console.log('Super Admin:        superadmin@queueless.dev / Password123!');
  console.log('========================================\n');

  if (process.env.NODE_ENV !== 'test') {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });
}
