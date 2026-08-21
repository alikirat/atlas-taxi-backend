import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

// Routers
import { healthRouter } from "./routes/health.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import rideRouter from "./routes/ride.js";
import adminRouter from "./routes/admin.js";

const app = express();

// View Engine
app.set("views", "./views");
app.set("view engine", "pug");

// Middlewares
app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:5173", "https://atlastaxi.netlify.app"], // Allow both local and production origins
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/rides", rideRouter);
app.use("/api/admin", adminRouter);

// Global error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Seems like we messed up somewhere...");
});

export default app;
