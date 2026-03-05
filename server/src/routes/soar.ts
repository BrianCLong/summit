import { Router } from 'express';
import { SOARPlatform } from '../siem/SIEMPlatform'; // Assuming SOAR is part of SIEM for this mock
import { getQueryParam } from '../utils/request';

const router = Router();
const soar = new SOARPlatform();

router.get('/playbooks', async (req, res) => {
    try {
        const playbooks = await soar.listPlaybooks();
        res.json(playbooks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/playbooks/:id', async (req, res) => {
    try {
        const playbook = await soar.getPlaybook(req.params.id);
        if (!playbook) {
            return res.status(404).json({ error: 'Playbook not found' });
        }
        res.json(playbook);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/playbooks/:id/execute', async (req, res) => {
    try {
        const result = await soar.executePlaybook(req.params.id, req.body.inputs);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
