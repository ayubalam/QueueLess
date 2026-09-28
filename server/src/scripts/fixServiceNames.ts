/**
 * One-time migration: strip leading hyphens and whitespace from Service and
 * Organization names stored in MongoDB.
 *
 * Run with:
 *   npx tsx src/scripts/fixServiceNames.ts
 *
 * The script is idempotent — records that already have clean names are left
 * untouched.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Service } from '../models/Service';
import { Organization } from '../models/Organization';

dotenv.config();

const stripLeadingHyphen = (value: string): string =>
  value.replace(/^[-\s]+/, '').trim();

const fixCollection = async (
  model: mongoose.Model<any>,
  label: string
) => {
  const docs = await model.find({});
  let fixed = 0;

  for (const doc of docs) {
    const cleanName = stripLeadingHyphen(doc.name);
    if (cleanName !== doc.name) {
      console.log(
        `[${label}] Fixing: "${doc.name}" → "${cleanName}" (id: ${doc._id})`
      );
      doc.name = cleanName;
      await doc.save();
      fixed++;
    }
  }

  console.log(`[${label}] Done — ${fixed} record(s) corrected out of ${docs.length} total.`);
};

const run = async () => {
  await connectDB();

  await fixCollection(Service, 'Service');
  await fixCollection(Organization, 'Organization');

  await mongoose.disconnect();
  console.log('\n[Migration] Complete. Database disconnected.');
};

run().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
