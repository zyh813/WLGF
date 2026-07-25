import { Router, type IRouter } from "express";
import { insert, findAll, update } from "../services/memory-store";
import { runReconScan } from "../services/vulnerability-scanner";

const router: IRouter = Router();

type RiskLevel = "critical" | "high" | "medium" | "low";

const seedAssets = [
  {
    host: "web-gateway-01",
    ipAddress: "10.0.1.10",
    os: "Ubuntu 22.04 LTS",
    services: [
      { port: 22, protocol: "tcp", service: "OpenSSH", version: "8.9p1" },
      { port: 80, protocol: "tcp", service: "nginx", version: "1.18.0" },
      { port: 443, protocol: "tcp", service: "nginx", version: "1.18.0" },
    ],
    riskLevel: "medium" as RiskLevel,
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
    riskLevel: "high" as RiskLevel,
    openVulnerabilities: 4,
  },
];

function ensureAssetsSeeded(): void {
  const existing = findAll("assets");
  if (existing.length === 0) {
    seedAssets.forEach((asset) => insert("assets", asset));
  }
}

router.get("/assets", async (req, res): Promise<void> => {
  ensureAssetsSeeded();
  const risk = typeof req.query.risk === "string" ? req.query.risk : "all";
  let assets = findAll("assets");
  if (risk && risk !== "all") {
    assets = assets.filter((a) => a.riskLevel === risk);
  }
  res.json(assets.map(formatAsset));
});

router.get("/assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid asset id" });
    return;
  }
  const assets = findAll("assets");
  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.json(formatAsset(asset));
});

router.get("/recon-jobs", async (_req, res): Promise<void> => {
  const jobs = findAll("recon_jobs").map(formatReconJob);
  res.json(jobs);
});

router.post("/recon-jobs", async (req, res): Promise<void> => {
  const { target } = req.body;
  
  if (!target) {
    res.status(400).json({ error: "Missing target" });
    return;
  }

  const job = insert("recon_jobs", {
    target,
    status: "running",
    discoveredCount: 0,
  });

  runReconScan(target).then(async (result) => {
    let discovered = 0;
    
    const services = result.openPorts.map((port, index) => ({
      port,
      protocol: "tcp",
      service: result.services[index] || "unknown",
      version: "-",
    }));

    const riskLevel: RiskLevel = result.vulnerabilities.length > 2 ? "critical" 
      : result.vulnerabilities.length > 0 ? "high"
      : result.openPorts.length > 5 ? "medium" : "low";

    const assets = findAll("assets");
    const existing = assets.find((a) => a.ipAddress === target);

    if (existing) {
      update("assets", { id: existing.id }, { 
        lastSeen: new Date(), 
        services,
        openVulnerabilities: result.vulnerabilities.length,
        riskLevel,
      });
    } else {
      insert("assets", {
        host: `host-${target.replace(/\./g, "-")}`,
        ipAddress: target,
        os: "Unknown",
        services,
        riskLevel,
        openVulnerabilities: result.vulnerabilities.length,
      });
      discovered += 1;
    }

    update("recon_jobs", { id: job.id }, { 
      status: "completed", 
      completedAt: new Date(), 
      discoveredCount: discovered,
    });
  }).catch(() => {
    update("recon_jobs", { id: job.id }, { status: "failed", completedAt: new Date() });
  });

  res.status(201).json(formatReconJob(job));
});

function formatAsset(a: any) {
  return {
    id: a.id,
    host: a.host,
    ipAddress: a.ipAddress,
    os: a.os,
    services: a.services ?? [],
    riskLevel: a.riskLevel,
    openVulnerabilities: a.openVulnerabilities,
    lastSeen: a.lastSeen ? a.lastSeen.toISOString() : new Date().toISOString(),
  };
}

function formatReconJob(j: any) {
  return {
    id: j.id,
    target: j.target,
    status: j.status,
    discoveredCount: j.discoveredCount,
    startedAt: j.startedAt ? j.startedAt.toISOString() : new Date().toISOString(),
    completedAt: j.completedAt ? j.completedAt.toISOString() : null,
  };
}

export default router;