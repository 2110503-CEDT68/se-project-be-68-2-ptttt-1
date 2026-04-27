const mongoose = require('mongoose');

const connectDB = async () => {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
        dbName: process.env.DB_NAME,
        family: 4,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
}

module.exports = connectDB;