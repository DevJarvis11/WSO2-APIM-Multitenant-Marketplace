 
// tenantB-logistics/shipment-service/index.js
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
    name:'RouteAPI',
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

const shipments = [
  { id: 'SHP-001', origin: 'Mumbai',  destination: 'Delhi',     status: 'in-transit', eta: '2026-04-22' },
  { id: 'SHP-002', origin: 'Chennai', destination: 'Kolkata',   status: 'delivered',  eta: '2026-04-18' },
  { id: 'SHP-003', origin: 'Pune',    destination: 'Hyderabad', status: 'pending',    eta: '2026-04-25' },
];

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'shipment-service' }));
app.get('/shipments', (req, res) => res.json(shipments));
app.get('/shipments/:id', (req, res) => {
  const s = shipments.find(s => s.id === req.params.id);
  s ? res.json(s) : res.status(404).json({ error: 'Shipment not found' });
});
app.post('/shipments', (req, res) => {
  const s = { id: 'SHP-00' + (shipments.length + 1), ...req.body };
  shipments.push(s);
  res.status(201).json(s);
});
app.listen(4003, () => console.log('Shipment service running on :4003'));
