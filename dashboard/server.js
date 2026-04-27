const express = require('express');
const cors = require('cors');
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the dashboard HTML
app.use(express.static(path.join(__dirname, 'public')));

const WSO2 = 'https://localhost:9443';
const fs = require('fs');
const EventEmitter = require('events');
const logEmitter = new EventEmitter();
let liveLogClients = [];
let realLogCounts = { INFO: 0, WARN: 0, ERROR: 0 };
const WSO2_LOG = `${process.env.HOME}/wso2am-4.6.0/repository/logs/wso2carbon.log`;
const AGENT = new https.Agent({ rejectUnauthorized: false });
const BASIC = 'Basic ' + Buffer.from('admin:admin').toString('base64');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = 'DevJarvis11/WSO2-APIM-Multitenant-Marketplace';
const GITHUB_API = 'https://api.github.com';
let adminToken = null;
let adminTokenExpiry = null;

async function getAdminToken() {
  if (adminToken && adminTokenExpiry && Date.now() < adminTokenExpiry - 60000) {
    return adminToken;
  }
  // Use DCR client we already created
  const CLIENT_ID = 'LhnervItLbcMS8LjBwvLbc9TACwa';
  const CLIENT_SECRET = '1jsnpcvc915KvryqctSS7NjfBCEa';
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${WSO2}/oauth2/token`, {
    method: 'POST',
    agent: AGENT,
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=apim:admin apim:tenant_manage'
  });
  const data = await res.json();
  console.log('Admin token response:', data);
  adminToken = data.access_token;
  adminTokenExpiry = Date.now() + (data.expires_in * 1000);
  return adminToken;
}

// ── WSO2 Log Parser ──────────────────────────────────
function parseLogLine(line) {
  if (!line.trim()) return null;
  let level = 'INFO';
  if (line.includes(' ERROR ') || line.includes('ERROR {')) level = 'ERROR';
  else if (line.includes(' WARN ') || line.includes('WARN {')) level = 'WARN';
  const errorCode = line.match(/9009\d\d/)?.[0] || null;
  const apiMatch = line.match(/\[(\w+API)\]/) || line.match(/API \{api:prod--(\w+):/);
  const api = apiMatch?.[1] || null;
  return { level, line: line.trim(), errorCode, api, ts: new Date().toISOString() };
}

function startLogWatcher() {
  fs.access(WSO2_LOG, fs.constants.R_OK, (err) => {
    if (err) { console.log('WSO2 log not found:', WSO2_LOG); return; }
    let fileSize = fs.statSync(WSO2_LOG).size;
    console.log('✓ WSO2 log watcher started');
    fs.watchFile(WSO2_LOG, { interval: 1000 }, (curr) => {
      if (curr.size <= fileSize) { fileSize = curr.size; return; }
      const stream = fs.createReadStream(WSO2_LOG, {
        start: fileSize, end: curr.size, encoding: 'utf8'
      });
      fileSize = curr.size;
      let buffer = '';
      stream.on('data', chunk => { buffer += chunk; });
      stream.on('end', () => {
        buffer.split('\n').filter(l => l.trim()).forEach(line => {
          const parsed = parseLogLine(line);
          if (!parsed) return;
          realLogCounts[parsed.level] = (realLogCounts[parsed.level] || 0) + 1;
          logEmitter.emit('log', parsed);
        });
      });
    });
  });
}

startLogWatcher();

// ── Helper ──────────────────────────────────────────
async function wso2(path, opts = {}, tenant = null) {
  const headers = {
    'Authorization': BASIC,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  if (tenant) headers['X-WSO2-Tenant'] = tenant;

  const res = await fetch(WSO2 + path, {
    ...opts,
    agent: AGENT,
    headers
  });
  return res.json();
}

// ── APIs ────────────────────────────────────────────
app.get('/api/apis', async (req, res) => {
  try {
    const [financeApis, logisticsApis] = await Promise.all([
      wso2('/api/am/publisher/v4/apis?limit=25', {}, 'finance.com'),
      wso2('/api/am/publisher/v4/apis?limit=25', {}, 'logistics.com')
    ]);

    const financeList = (financeApis.list || []).map(a => ({ ...a, tenant: 'finance.com' }));
    const logisticsList = (logisticsApis.list || []).map(a => ({ ...a, tenant: 'logistics.com' }));
    const combined = [...financeList, ...logisticsList];

    res.json({ count: combined.length, list: combined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apis', async (req, res) => {
  try {
    const { name, version, context, endpointConfig, policies, visibility, tenant } = req.body;

    const payload = {
      name,
      version,
      context,
      endpointConfig,
      policies: policies || ['Unlimited'],
      visibility: visibility || 'PUBLIC',
      transport: ['http', 'https'],
      securityScheme: ['oauth2'],
      type: 'HTTP'
    };

    const data = await wso2('/api/am/publisher/v4/apis', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, tenant || null);

    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apis/:id/publish', async (req, res) => {
  try {
    const tenant = req.query.tenant || null;
    const data = await wso2(
      `/api/am/publisher/v4/apis/change-lifecycle?apiId=${req.params.id}&action=Publish`,
      { method: 'POST' },
      tenant
    );
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tenants ─────────────────────────────────────────
app.get('/api/tenants', async (req, res) => {
  try {
    const data = await wso2('/api/v1/tenants?limit=25');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const { domain, adminUser } = req.body;
    const token = await getAdminToken();

    const result = await fetch(`${WSO2}/api/v1/tenants`, {
      method: 'POST',
      agent: AGENT,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        adminUser: {
          username: adminUser.username,
          password: adminUser.password,
          firstname: adminUser.firstname || 'Admin',
          lastname: adminUser.lastname || 'User',
          email: adminUser.email
        },
        active: true
      })
    });

    const text = await result.text();
    console.log('Tenant creation response:', text);

    try {
      res.json(JSON.parse(text));
    } catch {
      res.status(500).json({ error: 'WSO2 error', raw: text.substring(0, 300) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Subscriptions ───────────────────────────────────
app.get('/api/subscriptions', async (req, res) => {
  try {
    const data = await wso2('/api/am/store/v1/subscriptions');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Throttle Policies ───────────────────────────────
app.get('/api/throttle/policies', async (req, res) => {
  try {
    const data = await wso2('/api/am/admin/v4/throttling/policies/subscription');
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Token Proxy ─────────────────────────────────────
app.post('/api/token', async (req, res) => {
  const { clientId, clientSecret, scope } = req.body;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const r = await fetch(`${WSO2}/oauth2/token`, {
      method: 'POST', agent: AGENT,
      headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials${scope ? '&scope=' + scope : ''}`
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Backend Health Check ─────────────────────────────
app.get('/api/health', async (req, res) => {
  const backends = [
    { name: 'InvoiceAPI',  metricsUrl: 'http://localhost:4001/_metrics', healthUrl: 'http://localhost:4001/invoices' },
    { name: 'PaymentAPI',  metricsUrl: 'http://localhost:4002/_metrics', healthUrl: 'http://localhost:4002/payments' },
    { name: 'ShipmentAPI', metricsUrl: 'http://localhost:4003/_metrics', healthUrl: 'http://localhost:4003/shipments' },
    { name: 'RouteAPI',    metricsUrl: 'http://localhost:4004/_metrics', healthUrl: 'http://localhost:4004/routes' },
  ];

  const results = await Promise.all(backends.map(async b => {
    const start = Date.now();
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch(b.healthUrl),
        fetch(b.metricsUrl).then(r => r.json())
      ]);
      return {
        name: b.name,
        status: healthRes.status < 500 ? 'up' : 'down',
        latency: Date.now() - start,
        calls: metricsRes.calls || 0,
        callsPerMin: metricsRes.callsPerMin || 0,
        errors: metricsRes.errors || 0,
        errorRate: metricsRes.errorRate || '0.00',
        avgLatency: metricsRes.avgLatency || 0,
        p50: metricsRes.p50 || 0,
        p95: metricsRes.p95 || 0,
        p99: metricsRes.p99 || 0,
        statusCodes: metricsRes.statusCodes || {},
        uptime: metricsRes.uptime || 0
      };
    } catch {
      return { name: b.name, status: 'down', latency: 0, calls: 0, callsPerMin: 0, errors: 0, errorRate: '0.00', avgLatency: 0, p50: 0, p95: 0, p99: 0 };
    }
  }));
  res.json(results);
});

// ── SSE Live Log Stream ───────────────────────────────
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send keepalive every 15 seconds
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  const listener = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch(e) {
      clearInterval(keepalive);
      logEmitter.off('log', listener);
    }
  };

  logEmitter.on('log', listener);

  req.on('close', () => {
    clearInterval(keepalive);
    logEmitter.off('log', listener);
  });

  req.on('error', () => {
    clearInterval(keepalive);
    logEmitter.off('log', listener);
  });
});

// ── Log Counts ────────────────────────────────────────
app.get('/api/logs/counts', (req, res) => {
  res.json(realLogCounts);
});

// ── Recent Log Lines ──────────────────────────────────
app.get('/api/logs/recent', (req, res) => {
  const lines = [];
  fs.readFile(WSO2_LOG, 'utf8', (err, data) => {
    if (err) return res.json([]);
    const allLines = data.split('\n').filter(l => l.trim());
    allLines.slice(-100).forEach(line => {
      const parsed = parseLogLine(line);
      if (parsed) lines.push(parsed);
    });
    res.json(lines);
  });
});

// ── Choreo Analytics API ──────────────────────────────
app.get('/api/choreo/analytics', async (req, res) => {
  try {
    const window = req.query.window || '1h';
    const windowMap = { '1H':'1h','6H':'6h','24H':'24h','7D':'7d' };
    const timeRange = windowMap[window] || '1h';

    const choreoRes = await fetch(
      `https://analytics-api.choreo.dev/v1/analytics/api-usage?timeRange=${timeRange}`,
      {
        headers: {
          'Authorization': `Bearer aec8e346-57b8-47a2-940d-369abeb6f7f1`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!choreoRes.ok) {
      throw new Error(`Choreo API returned ${choreoRes.status}`);
    }

    const data = await choreoRes.json();
    res.json(data);
  } catch (e) {
    // Return structured mock if Choreo API unreachable
    res.json({
      source: 'fallback',
      totalCalls: 0,
      errorRate: 0,
      p95Latency: 0,
      apis: []
    });
  }
});

// ── GitHub Actions — Run History ─────────────────────
app.get('/api/pipeline/runs', async (req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/runs?per_page=10`,
      { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } }
    );
    const data = await r.json();
    if (!data.workflow_runs) return res.json({ runs: [] });

    const runs = data.workflow_runs.map(run => ({
      id: run.id,
      run_number: run.run_number,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
      updated_at: run.updated_at,
      html_url: run.html_url,
      trigger: run.event,
      duration: run.updated_at && run.created_at
        ? Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000)
        : 0
    }));
    res.json({ runs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GitHub Actions — Job Details for Latest Run ───────
app.get('/api/pipeline/jobs', async (req, res) => {
  try {
    // Get latest run first
    const runsRes = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/runs?per_page=1`,
      { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } }
    );
    const runsData = await runsRes.json();
    if (!runsData.workflow_runs?.length) return res.json({ jobs: [] });

    const latestRunId = runsData.workflow_runs[0].id;
    const jobsRes = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/runs/${latestRunId}/jobs`,
      { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } }
    );
    const jobsData = await jobsRes.json();
    const jobs = (jobsData.jobs || []).map(job => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      duration: job.started_at && job.completed_at
        ? Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000)
        : 0
    }));
    res.json({ jobs, runId: latestRunId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GitHub Actions — Trigger New Run ─────────────────
app.post('/api/pipeline/trigger', async (req, res) => {
  try {
    const r = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/deploy-apis.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      }
    );
    if (r.status === 204) {
      res.json({ success: true, message: 'Pipeline triggered successfully' });
    } else {
      const data = await r.json();
      res.status(r.status).json({ success: false, message: data.message });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Real Notifications ────────────────────────────────
const notifications = [];
const gatewayStatusCodes = { '200':0, '201':0, '401':0, '403':0, '429':0, '500':0 };

app.get('/api/notifications', (req, res) => {
  res.json(notifications.slice(-20).reverse());
});

app.post('/api/notifications/clear', (req, res) => {
  notifications.length = 0;
  res.json({ success: true });
});

// Auto-generate notifications from real events
logEmitter.on('log', (data) => {
  if (data.level === 'ERROR') {
    notifications.push({
      id: Date.now(),
      icon: '🚨',
      color: 'red',
      text: data.line.substring(0, 120),
      time: new Date().toLocaleTimeString('en-US', {hour12:false}),
      level: 'error'
    });
  } else if (data.line.includes('900910') || data.line.includes('authentication failure')) {
    notifications.push({
      id: Date.now(),
      icon: '⚠️',
      color: 'amber',
      text: data.line.substring(0, 120),
      time: new Date().toLocaleTimeString('en-US', {hour12:false}),
      level: 'warn'
    });
  } else if (data.line.includes('PUBLISHED') || data.line.includes('deployed')) {
    notifications.push({
      id: Date.now(),
      icon: '✅',
      color: 'green',
      text: data.line.substring(0, 120),
      time: new Date().toLocaleTimeString('en-US', {hour12:false}),
      level: 'info'
    });
  }
  // Keep max 50
// Track gateway status codes from real log patterns
  if (data.line.includes('Invalid Credentials') || data.line.includes('900901') || data.line.includes('900902')) {
    gatewayStatusCodes['401']++;
  } else if (data.line.includes('does not allow you to access') || data.line.includes('900910') || data.line.includes('900906')) {
    gatewayStatusCodes['403']++;
  } else if (data.line.includes('throttle') || data.line.includes('900912') || data.line.includes('Throttled out')) {
    gatewayStatusCodes['429']++;
  } else if (data.line.includes('LogMediator') && data.line.includes('TENANT')) {
    gatewayStatusCodes['200']++;
  }
  // Keep max 50
  if (notifications.length > 50) notifications.shift();
});

app.get('/api/gateway/statuscodes', (req, res) => {
  res.json(gatewayStatusCodes);
});

app.listen(5000, () => console.log('Dashboard server running on http://localhost:5000'));

