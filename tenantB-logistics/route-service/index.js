// tenantB-logistics/route-service/index.js
const express = require('express');
const app = express();

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
