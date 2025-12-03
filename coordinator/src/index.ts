import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { coordinatorRouter } from "./routes/coordinator";
import { nodeRouter } from "./routes/node";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/intents", coordinatorRouter);
app.use("/nodes", nodeRouter);
app.use("/tasks", nodeRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "xvoid-coordinator" });
});

app.listen(PORT, () => {
  console.log(`XVoid Coordinator running on port ${PORT}`);
});

