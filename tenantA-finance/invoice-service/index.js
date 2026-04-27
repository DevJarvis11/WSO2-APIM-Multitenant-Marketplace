// tenantA-finance/invoice-service/index.js
const express = require('express');
const app = express();
const metrics = { calls:0, errors:0, totalLatency:0, lastMinuteCalls:[], statusCodes:{} };
app.use((req,res,next)=>{
  if(req.path==='/_metrics') return next();
  const start=Date.now();
  res.on('finish',()=>{
    const latency=Date.now()-start;
    metrics.calls++;
    metrics.totalLatency+=latency;
    if(res.statusCode>=400) metrics.errors++;
    metrics.statusCodes[res.statusCode]=(metrics.statusCodes[res.statusCode]||0)+1;
    metrics.lastMinuteCalls.push({ts:Date.now(),latency,status:res.statusCode});
    metrics.lastMinuteCalls=metrics.lastMinuteCalls.filter(c=>c.ts>Date.now()-60000);
  });
  next();
});
app.get('/_metrics',(req,res)=>{
  const r=metrics.lastMinuteCalls;
  const l=[...r.map(c=>c.latency)].sort((a,b)=>a-b);
  res.json({
    name:'InvoiceAPI',
    calls:metrics.calls,
    callsPerMin:r.length,
    errors:metrics.errors,
    errorRate:metrics.calls?((metrics.errors/metrics.calls)*100).toFixed(2):'0.00',
    avgLatency:metrics.calls?Math.round(metrics.totalLatency/metrics.calls):0,
    p50:l[Math.floor(l.length*0.5)]||0,
    p95:l[Math.floor(l.length*0.95)]||0,
    p99:l[Math.floor(l.length*0.99)]||0,
    statusCodes:metrics.statusCodes,
    uptime:process.uptime()
  });
});

app.use(express.json());

const invoices = [
  { id: 'INV-001', client: 'Acme Corp',  amount: 15000, status: 'paid',    due: '2026-03-01' },
  { id: 'INV-002', client: 'Beta Ltd',   amount: 8200,  status: 'pending', due: '2026-04-15' },
  { id: 'INV-003', client: 'Gamma Inc',  amount: 22500, status: 'overdue', due: '2026-02-01' },
  { id: 'INV-004', client: 'Delta Corp', amount: 5500,  status: 'paid',    due: '2026-04-01' },
];

app.get('/health', (req, res) => {
  console.log('Health check from:', req.headers['x-tenant-id'] || 'unknown');
  res.json({ status: 'UP', service: 'invoice-service', tenant: 'finance.com' });
});
app.get('/invoices', (req, res) => {
  console.log('GET /invoices | Tenant:', req.headers['x-tenant-id']);
  res.json(invoices);
});
app.get('/invoices/:id', (req, res) => {
  const inv = invoices.find(i => i.id === req.params.id);
  inv ? res.json(inv) : res.status(404).json({ error: 'Invoice not found' });
});
app.post('/invoices', (req, res) => {
  const inv = { id: 'INV-00' + (invoices.length + 1), ...req.body };
  invoices.push(inv);
  res.status(201).json(inv);
});

app.listen(4001, () => console.log('Invoice service running on :4001'));
