import { OnnxDeepfakeDetector } from './DeepfakeDetector';

const detector = new OnnxDeepfakeDetector(
  process.env.DEEPFAKE_MODEL_PATH || 'server/models/mesonet-v1.onnx'
);

export async function precheckAndRoute(filePath: string, mime: string) {
  await detector.load();
  const df = await detector.infer({ filePath, mime });
  const flags: string[] = [];
  if (df.band !== 'low') flags.push(`deepfake_${df.band}`);
  const quarantined = df.band !== 'low';
  return { quarantined, flags, detector: df };
}
