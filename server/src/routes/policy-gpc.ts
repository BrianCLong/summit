
import { Router } from 'express';
import { GraphPolicyCompiler } from '../ec-gpc/policy-compiler.js';
import { PolicyRuntime } from '../ec-gpc/policy-runtime.js';
import { CompileRequest } from '../ec-gpc/types.js';

const router = Router();
const compiler = new GraphPolicyCompiler();
const runtime = new PolicyRuntime();

router.post('/compile', async (req, res) => {
  try {
    const request: CompileRequest = req.body;
    const response = compiler.compile(request);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { policy, input } = req.body;
    if (!policy) {
        // Option to compile on the fly could go here
        return res.status(400).json({ error: "Policy is required" });
    }
    const trace = await runtime.execute(policy, input);
    res.json(trace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
