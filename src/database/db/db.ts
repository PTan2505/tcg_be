import mongoose from 'mongoose'

const { MONGODB_URI } = process.env

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined')
}

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI)
        console.log('✅ MongoDB connected')
    } catch (err) {
        console.error('❌ MongoDB connection error:', err)
    }
}
