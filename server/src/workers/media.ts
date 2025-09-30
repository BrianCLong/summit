import ffmpeg from 'fluent-ffmpeg';
import { createWorker } from 'tesseract.js';
import { upsertTimeline } from '../store/timeline';
import { v4 as uuid } from 'uuid';

export async function ocrImageToTimeline({ contactId, filePath, origin }:{n  contactId:string; filePath:string; origin?:string;
}){
  const worker = await createWorker({ cachePath:'/tmp/tess' });
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data:{ text } } = await worker.recognize(filePath);
  await worker.terminate();

  await upsertTimeline({
    contactId, kind:'asset.image', ts:new Date().toISOString(),
    payload:{ url:filePath, mime:'image/png', ocr:text, origin }, source:{ system:'ingest' }
  });
}

export async function extractKeyframesAndOCR({ contactId, videoPath }:{n  contactId:string; videoPath:string;
}){
  // 1) extract 1 frame every N seconds
  const framesDir = `/tmp/frames_${uuid()}`;
  await fsMkdir(framesDir);
  await new Promise((resolve,reject)=>{
    ffmpeg(videoPath).output(`${framesDir}/kf_%04d.png`).outputOptions(['-vf','fps=1']).on('end',resolve).on('error',reject).run();
  });
  // 2) OCR each frame
  // (limit to first 30 frames for perf; tune later)
  const frames = await fsReaddir(framesDir);
  const take = frames.slice(0,30);
  for (const f of take){
    await ocrImageToTimeline({ contactId, filePath:`${framesDir}/${f}`, origin:'video.keyframe' });
  }
}

// helpers
import { promises as fs } from 'fs';
async function fsMkdir(p:string){ try{ await fs.mkdir(p); }catch{} }
async function fsReaddir(p:string){ return (await fs.readdir(p)).map(x=>x); }