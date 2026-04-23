// tenantA-finance/invoice-service/index.js
const express = require('express');
const app = express();
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
