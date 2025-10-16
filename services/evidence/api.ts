import express from 'express';
const app = express();
app.get('/v1/releases/:id', (req, res) => {
  res.json({
    id: req.params.id,
    controls: [
      /*...*/
    ],
    provenance: {
      /*...*/
    },
  });
});
app.listen(8090);
