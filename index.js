import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: "false" });
    console.log("Connected to MongoDB");
  } catch (e) {
    console.error("Error connecting to MongoDB:", e);
    process.exit(1); // Exit process on failure
  }
};

connectDB();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
