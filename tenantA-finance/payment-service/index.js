// tenantA-finance/payment-service/index.js
const express = require('express');
const app = express();
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
