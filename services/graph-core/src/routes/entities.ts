import { Router, type Router as RouterType } from 'express';
import { EntitySchema } from '../schema';
import { store } from '../services/store';

const router: RouterType = Router();

router.post('/:type', (req, res) => {
  const parse = EntitySchema.safeParse({
    ...req.body,
    type: req.params.type,
  });
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const entity = store.upsertEntity(parse.data);
  res.json(entity);
});

export default router;
