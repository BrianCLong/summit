const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const port = 3000;

app.post('/searchCatalog', (req, res) => {
  res.json({ results: [{ id: '123', name: 'Product A' }] });
});

app.post('/lookupUser', (req, res) => {
  res.json({ id: '456', name: 'John Doe' });
});

app.post('/createTicket', (req, res) => {
  res.json({ id: '789', status: 'OPEN' });
});

app.listen(port, () => {
  console.log(`Mock tool server listening at http://localhost:${port}`);
});
