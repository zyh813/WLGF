import { readFileSync, watch, type FSWatcher } from "fs";
import { insert, findAll } from "./memory-store";
import { logger } from "../lib/logger";

const LOG_FILES = [
  "/var/log/auth.log",
  "/var/log/syslog",
  "/var/log/messages",
  "/var/log/secure",
  "/var/log/kern.log",
];

const LOG_PATTERNS: Record<string, (line: string) => { level: string; message: string; details?: string } | null> = {
  auth: (line) => {
    if (/Failed password|authentication failure|invalid user/.test(line)) {
      return { level: "critical", message: `认证失败: ${line.substring(0, 100)}` };
    }
    if (/Accepted password|session opened/.test(line)) {
      return { level: "info", message: `登录成功: ${line.substring(0, 100)}` };
    }
    return null;
  },
  firewall: (line) => {
    if (/DENY|DROP|rejected/.test(line)) {
      return { level: "warning", message: `防火墙拦截: ${line.substring(0, 100)}` };
    }
    if (/ACCEPT|allowed/.test(line)) {
      return { level: "info", message: `防火墙允许: ${line.substring(0, 100)}` };
    }
    return null;
  },
  intrusion: (line) => {
    if (/intrusion|attack|exploit|shellcode|payload/.test(line)) {
      return { level: "critical", message: `入侵检测: ${line.substring(0, 100)}` };
    }
    return null;
  },
  system: (line) => {
    if (/error|Error|ERROR/.test(line)) {
      return { level: "error", message: `系统错误: ${line.substring(0, 100)}` };
    }
    if (/warning|Warning|WARNING/.test(line)) {
      return { level: "warning", message: `系统警告: ${line.substring(0, 100)}` };
    }
    return null;
  },
};

function parseLogLine(line: string, source: string): { level: string; message: string; details?: string } | null {
  for (const [, pattern] of Object.entries(LOG_PATTERNS)) {
    const result = pattern(line);
    if (result) {
      return result;
    }
  }
  
  if (source.includes("auth")) {
    return { level: "info", message: `认证日志: ${line.substring(0, 150)}` };
  }
  
  return null;
}

export async function readLogFile(filePath: string): Promise<void> {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const source = filePath.split("/").pop() || "unknown";
    
    for (const line of lines.slice(-100)) {
      const parsed = parseLogLine(line, source);
      if (parsed) {
        insert("security_logs", {
          level: parsed.level as "info" | "warning" | "error" | "critical",
          message: parsed.message,
          source: `system-${source}`,
          details: parsed.details,
        });
      }
    }
    
    logger.debug({ filePath, lines: lines.length }, "Read log file");
  } catch (err) {
    logger.warn({ err, filePath }, "Failed to read log file");
  }
}

export async function readAllLogs(): Promise<void> {
  for (const filePath of LOG_FILES) {
    await readLogFile(filePath);
  }
}

let watchers: FSWatcher[] = [];

export function startLogMonitoring(): void {
  stopLogMonitoring();
  
  for (const filePath of LOG_FILES) {
    try {
      const watcher = watch(filePath, async (eventType) => {
        if (eventType === "change") {
          await readLogFile(filePath);
        }
      });
      watchers.push(watcher);
      logger.info({ filePath }, "Started monitoring log file");
    } catch (err) {
      logger.warn({ err, filePath }, "Failed to monitor log file");
    }
  }
}

export function stopLogMonitoring(): void {
  for (const watcher of watchers) {
    watcher.close();
  }
  watchers = [];
  logger.info("Stopped log monitoring");
}

export async function logPlatformEvent(message: string, level: "info" | "warning" | "error" | "critical" = "info", details?: string): Promise<void> {
  insert("security_logs", {
    level,
    message,
    source: "platform",
    details,
  });
  logger.info({ message, level }, "Logged platform event");
}

export function getAllLogs(level?: string, limit?: number): any[] {
  let logs = findAll("security_logs");
  
  if (level) {
    logs = logs.filter((l) => l.level === level);
  }
  if (limit) {
    logs = logs.slice(0, limit);
  }
  
  return logs.map((l) => ({
    ...l,
    timestamp: l.timestamp.toISOString(),
  }));
}