// tenantB-logistics/route-service/index.js
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
    name:'ShipmentAPI',
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
const routes = [
  { id: 'RTE-001', from: 'Mumbai',  to: 'Delhi',     distanceKm: 1450, mode: 'truck' },
  { id: 'RTE-002', from: 'Chennai', to: 'Kolkata',   distanceKm: 1700, mode: 'rail'  },
  { id: 'RTE-003', from: 'Pune',    to: 'Hyderabad', distanceKm: 560,  mode: 'truck' },
];

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'route-service' }));
app.get('/routes', (req, res) => res.json(routes));
app.get('/routes/:id', (req, res) => {
  const r = routes.find(r => r.id === req.params.id);
  r ? res.json(r) : res.status(404).json({ error: 'Route not found' });
});
app.listen(4004, () => console.log('Route service running on :4004'));
