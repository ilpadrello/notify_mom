import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "../../logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";

const logger = pino(
  {
    level: logLevel,
  },
  pino.transport({
    targets: [
      {
        level: logLevel,
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: false,
          translateTime: "SYS:standard",
        },
      },
      {
        level: logLevel,
        target: "pino/file",
        options: {
          destination: path.join(logsDir, "app.log"),
        },
      },
    ],
  }),
);

export default logger;
