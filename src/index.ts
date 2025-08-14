// src/index.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import { setupSwagger } from "./config/swagger";
import { logger } from "./utils/logger";
import cookieParser from "cookie-parser";
import apparelProductRoutes from "./routes/apparelProduct.routes";

dotenv.config();
const app = express();

// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     // origin: "http://localhost:3000",
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: (origin, callback) => {
      // If request has no origin (like mobile apps or curl), allow it
      if (!origin) return callback(null, true);
      // Echo back the origin to allow credentials from any domain
      return callback(null, origin);
    },
    credentials: true, // ✅ allow cookies / authorization headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options(
  "*",
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    // Optional: Handle missing files
    fallthrough: true,
  })
);
// Log every request
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Swagger docs
setupSwagger(app);

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/apparel", apparelProductRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    logger.info("MongoDB connected");
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  })
  .catch((err) => logger.error(`DB connection error: ${err}`));
