import { Router } from 'express';

import { authRequired } from '../../../shared/src/middleware/auth.js';
import {
  activateAddress,
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../../../shared/src/userAddresses.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  res.json({ addresses: listAddresses(req.user.id) });
});

router.post('/', authRequired, (req, res) => {
  const result = createAddress(req.user.id, req.body ?? {});
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({ address: result.address });
});

router.put('/:id', authRequired, (req, res) => {
  const result = updateAddress(req.user.id, req.params.id, req.body ?? {});
  if (!result.ok) {
    return res.status(result.error === 'Address not found' ? 404 : 400).json({ error: result.error });
  }
  res.json({ address: result.address });
});

router.delete('/:id', authRequired, (req, res) => {
  const result = deleteAddress(req.user.id, req.params.id);
  if (!result.ok) {
    return res.status(result.error === 'Address not found' ? 404 : 400).json({ error: result.error });
  }
  res.json({ success: true });
});

router.post('/:id/activate', authRequired, (req, res) => {
  const result = activateAddress(req.user.id, req.params.id);
  if (!result.ok) {
    return res.status(result.error === 'Address not found' ? 404 : 400).json({ error: result.error });
  }
  res.json({ address: result.address });
});

export default router;
