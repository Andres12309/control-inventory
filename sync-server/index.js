import cors from 'cors';
import express from 'express';
import { networkInterfaces } from 'os';

import { applyPush, loadDb, pullSnapshot, saveDb } from './store.js';

const PORT = Number(process.env.PORT) || 8787;
let db = loadDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'control-inventario-sync' });
});

app.get('/api/sync/pull', (_req, res) => {
  res.json(pullSnapshot(db));
});

app.post('/api/sync/push', (req, res) => {
  db = applyPush(db, req.body ?? {});
  saveDb(db);
  res.json({ ok: true });
});

function localIps() {
  const ips = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const cfg of iface ?? []) {
      if (cfg.family === 'IPv4' && !cfg.internal) ips.push(cfg.address);
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  const ips = localIps();
  console.log('\n=== Coordinador de inventario (LAN) ===');
  console.log(`Puerto: ${PORT}`);
  if (ips.length) {
    for (const ip of ips) console.log(`URL móviles: http://${ip}:${PORT}`);
  } else {
    console.log(`URL: http://localhost:${PORT}`);
  }
  console.log('=====================================\n');
});
