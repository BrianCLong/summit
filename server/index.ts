import app from './server';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Maestro server listening on port ${PORT}`);
});
