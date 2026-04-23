 
// tenantB-logistics/shipment-service/index.js
const express = require('express');
const app = express();
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
