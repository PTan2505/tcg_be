import mongoose from 'mongoose';

const { MONGODB_URI } = process.env

if (!MONGODB_URI) {
    const { getMessage } = require('../../shared/constants/messages');
    const AppError = require('../../shared/errors/AppError').default;
    throw new AppError(getMessage('ERRORS.INTERNAL_SERVER_ERROR') + ': MONGODB_URI not set', 500);
}

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI)
        console.log('✅ MongoDB connected')
    } catch (err) {
        console.error('❌ MongoDB connection error:', err)
    }
}
