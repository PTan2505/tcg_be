import bcrypt from "bcryptjs";
import UserModel from "../database/models/user";

export interface SuperuserConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export const defaultSuperuserConfig: SuperuserConfig = {
  email: process.env.SUPERUSER_EMAIL || 'admin@tcgbackend.local',
  password: process.env.SUPERUSER_PASSWORD || 'SuperAdmin123!',
  firstName: 'Super',
  lastName: 'Admin',
  dateOfBirth: '1990-01-01'
};

export async function initializeSuperuser(config: SuperuserConfig = defaultSuperuserConfig): Promise<boolean> {
  try {
    console.log('🔧 Initializing superuser...');
    
    // Check if superuser already exists
    const existingSuperuser = await UserModel.findOne({ email: config.email });
    
    if (existingSuperuser) {
      console.log(`✅ Superuser already exists: ${config.email}`);
      
      // Make sure the existing user is verified
      if (!existingSuperuser.isEmailVerified) {
        existingSuperuser.isEmailVerified = true;
        await existingSuperuser.save();
        console.log('✅ Superuser email verification status updated');
      }
      
      return true;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(config.password, salt);

    // Create superuser with verified email
    const superuser = await UserModel.create({
      email: config.email,
      password: hashedPassword,
      firstName: config.firstName,
      lastName: config.lastName,
      dateOfBirth: new Date(config.dateOfBirth),
      isEmailVerified: true, // Pre-verified for testing/admin purposes
    });

    console.log(`✅ Superuser created successfully: ${config.email}`);
    console.log(`ℹ️  Superuser ID: ${superuser._id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize superuser:', error);
    return false;
  }
}

// Standalone execution for manual superuser creation
export async function createSuperuserStandalone() {
  const { connectDB } = await import('../database/db/db');
  
  try {
    await connectDB();
    const success = await initializeSuperuser();
    
    if (success) {
      console.log('🎉 Superuser initialization completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Superuser initialization failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  createSuperuserStandalone();
}