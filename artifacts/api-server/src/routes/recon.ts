import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, assetsTable, reconJobsTable, type AssetService } from "@workspace/db";
import { StartReconJobBody } from "@workspace/api-zod";

const router: IRouter = Router();

type RiskLevel = "critical" | "high" | "medium" | "low";

const seedAssets: Array<{
  host: string;
  ipAddress: string;
  os: string;
  services: AssetService[];
  riskLevel: RiskLevel;
  openVulnerabilities: number;
}> = [
  {
    host: "web-gateway-01",
    ipAddress: "10.0.1.10",
    os: "Ubuntu 22.04 LTS",
    services: [
      { port: 22, protocol: "tcp", service: "OpenSSH", version: "8.9p1" },
      { port: 80, protocol: "tcp", service: "nginx", version: "1.18.0" },
      { port: 443, protocol: "tcp", service: "nginx", version: "1.18.0" },
    ],
    riskLevel: "medium",
    openVulnerabilities: 2,
  },
  {
    host: "db-primary",
    ipAddress: "10.0.2.20",
    os: "Debian 11",
    services: [
      { port: 22, protocol: "tcp", service: "OpenSSH", version: "8.4p1" },
      { port: 5432, protocol: "tcp", service: "PostgreSQL", version: "14.5" },
    ],
    riskLevel: "high",
    openVulnerabilities: 4,
  },
  {
    host: "legacy-fileserver",
    ipAddress: "10.0.3.30",
    os: "Windows Server 2012 R2",
    services: [
      { port: 139, protocol: "tcp", service: "NetBIOS-SSN", version: "-" },
      { port: 445, protocol: "tcp", service: "SMB", version: "SMBv1" },
      { port: 3389, protocol: "tcp", service: "RDP", version: "-" },
    ],
    riskLevel: "critical",
    openVulnerabilities: 7,
  },
  {
    host: "internal-dns",
    ipAddress: "10.0.1.53",
    os: "Alpine Linux 3.18",
    services: [
      { port: 53, protocol: "udp", service: "dnsmasq", version: "2.89" },
    ],
    riskLevel: "low",
    openVulnerabilities: 0,
  },
];

async function ensureAssetsSeeded(): Promise<void> {
  const existing = await db.select({ id: assetsTable.id }).from(assetsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(assetsTable).values(seedAssets);
  }
}

// Candidate hosts a simulated sweep may "discover".
const discoveryPool: Array<{
  host: string;
  ipAddress: string;
  os: string;
  services: AssetService[];
  riskLevel: RiskLevel;
  openVulnerabilities: number;
}> = [
  {
    host: "app-node-04",
    ipAddress: "10.0.4.14",
    os: "Ubuntu 20.04 LTS",
    services: [
      { port: 22, protocol: "tcp", service: "OpenSSH", version: "8.2p1" },
      { port: 8080, protocol: "tcp", service: "Apache Tomcat", version: "9.0.65" },
    ],
    riskLevel: "medium",
    openVulnerabilities: 1,
  },
  {
    host: "mail-relay",
    ipAddress: "10.0.5.25",
    os: "CentOS 7",
    services: [
      { port: 25, protocol: "tcp", service: "Postfix", version: "3.5.8" },
      { port: 143, protocol: "tcp", service: "Dovecot IMAP", version: "2.3.16" },
      { port: 993, protocol: "tcp", service: "Dovecot IMAPS", version: "2.3.16" },
    ],
    riskLevel: "high",
    openVulnerabilities: 3,
  },
  {
    host: "iot-camera-12",
    ipAddress: "10.0.6.112",
    os: "Embedded Linux",
    services: [
      { port: 80, protocol: "tcp", service: "GoAhead httpd", version: "2.5" },
      { port: 554, protocol: "tcp", service: "RTSP", version: "-" },
    ],
    riskLevel: "critical",
    openVulnerabilities: 5,
  },
  {
    host: "backup-store",
    ipAddress: "10.0.2.40",
    os: "TrueNAS CORE 13",
    services: [
      { port: 22, protocol: "tcp", service: "OpenSSH", version: "8.8p1" },
      { port: 445, protocol: "tcp", service: "SMB", version: "SMBv3" },
    ],
    riskLevel: "low",
    openVulnerabilities: 0,
  },
];

router.get("/assets", async (req, res): Promise<void> => {
  await ensureAssetsSeeded();
  const risk = typeof req.query.risk === "string" ? req.query.risk : "all";
  const assets = await db.select().from(assetsTable).orderBy(desc(assetsTable.lastSeen));
  const filtered =
    risk && risk !== "all" ? assets.filter((a) => a.riskLevel === risk) : assets;
  res.json(filtered.map(formatAsset));
});

router.get("/assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid asset id" });
    return;
  }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, id));
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.json(formatAsset(asset));
});

router.get("/recon-jobs", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(reconJobsTable).orderBy(desc(reconJobsTable.startedAt));
  res.json(jobs.map(formatReconJob));
});

router.post("/recon-jobs", async (req, res): Promise<void> => {
  const parsed = StartReconJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [job] = await db
    .insert(reconJobsTable)
    .values({ target: parsed.data.target, status: "running" })
    .returning();

  // Simulate the reconnaissance sweep completing after a brief delay.
  setTimeout(async () => {
    try {
      const numDiscovered = 1 + Math.floor(Math.random() * discoveryPool.length);
      const shuffled = [...discoveryPool].sort(() => Math.random() - 0.5).slice(0, numDiscovered);

      let discovered = 0;
      for (const candidate of shuffled) {
        const [existing] = await db
          .select({ id: assetsTable.id })
          .from(assetsTable)
          .where(eq(assetsTable.ipAddress, candidate.ipAddress));
        if (existing) {
          // Refresh last-seen for already-known assets.
          await db
            .update(assetsTable)
            .set({ lastSeen: new Date(), services: candidate.services })
            .where(eq(assetsTable.id, existing.id));
        } else {
          await db.insert(assetsTable).values(candidate);
          discovered += 1;
        }
      }

      await db
        .update(reconJobsTable)
        .set({ status: "completed", completedAt: new Date(), discoveredCount: discovered })
        .where(eq(reconJobsTable.id, job.id));
    } catch {
      await db
        .update(reconJobsTable)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(reconJobsTable.id, job.id));
    }
  }, 4000);

  res.status(201).json(formatReconJob(job));
});

function formatAsset(a: typeof assetsTable.$inferSelect) {
  return {
    id: a.id,
    host: a.host,
    ipAddress: a.ipAddress,
    os: a.os,
    services: a.services ?? [],
    riskLevel: a.riskLevel,
    openVulnerabilities: a.openVulnerabilities,
    lastSeen: a.lastSeen.toISOString(),
  };
}

function formatReconJob(j: typeof reconJobsTable.$inferSelect) {
  return {
    id: j.id,
    target: j.target,
    status: j.status,
    discoveredCount: j.discoveredCount,
    startedAt: j.startedAt.toISOString(),
    completedAt: j.completedAt ? j.completedAt.toISOString() : null,
  };
}

export default router;
