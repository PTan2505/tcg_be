import mongoose from 'mongoose';
import UserModel from '../src/database/models/user';

async function main() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/tcg_be';
  if (!process.env.ADMIN_EMAIL) {
    console.error('Please set ADMIN_EMAIL env var to run this script');
    process.exit(1);
  }

  await mongoose.connect(mongo, { } as any);

  const admin = await UserModel.findOne({ email: process.env.ADMIN_EMAIL });
  if (!admin || !admin.isAdmin) {
    console.error('Admin user (ADMIN_EMAIL) not found in DB or is not an admin. Make sure the admin user exists and has isAdmin=true');
    process.exit(2);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: ts-node scripts/togglePremium.ts <targetEmail> <true|false>');
    process.exit(0);
  }

  const [targetEmail, flag] = args;
  const isPremium = flag === 'true';

  const target = await UserModel.findOne({ email: targetEmail });
  if (!target) {
    console.error('Target user not found');
    process.exit(3);
  }

  target.isPremium = isPremium;
  await target.save();
  console.log(`Updated ${target.email} isPremium -> ${isPremium}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
