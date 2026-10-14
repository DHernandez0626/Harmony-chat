import "./env";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRouter from "./routes/auth/AuthController";
import roomsRouter from "./routes/Rooms/RoomsRouter";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
