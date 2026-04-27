// tenantA-finance/payment-service/index.js
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
    name:'PaymentAPI',
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

const payments = [
  { id: 'PAY-001', invoiceId: 'INV-001', amount: 15000, method: 'wire', ts: '2026-03-01T09:00:00Z' },
  { id: 'PAY-002', invoiceId: 'INV-002', amount: 4100,  method: 'card', ts: '2026-04-01T14:30:00Z' },
  { id: 'PAY-003', invoiceId: 'INV-004', amount: 5500,  method: 'upi',  ts: '2026-04-05T11:00:00Z' },
];

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'payment-service' }));
app.get('/payments', (req, res) => res.json(payments));
app.get('/payments/:id', (req, res) => {
  const p = payments.find(p => p.id === req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Payment not found' });
});
app.post('/payments', (req, res) => {
  const p = { id: 'PAY-00' + (payments.length + 1), ...req.body, ts: new Date().toISOString() };
  payments.push(p);
  res.status(201).json(p);
});
app.listen(4002, () => console.log('Payment service running on :4002'));
