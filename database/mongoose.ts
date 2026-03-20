import mongoose from 'mongoose';

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null
        promise: Promise<typeof mongoose> | null
    }
}

let cached = global.mongooseCache || (global.mongooseCache = { conn: null, promise: null });

export const connectToDatabase = async () => {
    if (cached.conn) return cached.conn;

    const mongodbUri =
        process.env.MONGODB_URI ||
        process.env.MONGODB_URL ||
        process.env.MONGO_URL ||
        process.env.mongo_url;

    if (!mongodbUri) {
        throw new Error('Please provide a valid MongoDB connection string via MONGODB_URI, MONGODB_URL, MONGO_URL, or mongo_url');
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongodbUri, { bufferCommands: false });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('MongoDB connection error. Please make sure MongoDB is running. ' + e);
        throw e;
    }

    console.info('Connected to MongoDB');
    return cached.conn;
}
