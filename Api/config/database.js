import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_URL,{
      connectTimeoutMS: 90000,           // 30 seconds to establish connection
      socketTimeoutMS: 30000,            // 30 seconds for I/O operations
      serverSelectionTimeoutMS: 30000,   // 30 seconds to select a server
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;
