import express from 'express';
import push from './push';
import { startReplicator } from './bootstrap';

const app = express();
app.use(push as any);
startReplicator();
app.listen(process.env.PORT || 4030);

