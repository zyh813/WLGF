import app from "./app";
import { logger } from "./lib/logger";
import {
  startAlertEngine,
  startFirewallSync,
  startLogMonitoring,
  syncNetworkConnections,
  updateHourlyStats,
} from "./services";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrap(): Promise<void> {
  logger.info("Starting CyberShield Security Platform...");

  await syncNetworkConnections();
  logger.info("Network connections synced");

  startFirewallSync();
  startAlertEngine();
  startLogMonitoring();

  setInterval(() => {
    syncNetworkConnections();
  }, 10000);

  setInterval(() => {
    updateHourlyStats();
  }, 5000);

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    logger.info("All security services started successfully");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to bootstrap application");
  process.exit(1);
});