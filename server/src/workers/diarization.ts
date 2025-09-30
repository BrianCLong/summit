// Simple energy-based + alternating diarization stub.
// Replace with pyannote or cloud diarization for accuracy.
export async function diarizeSegments(segments:{t0:number,t1:number,text:string}[]){
  let current:'A'|'B'='A'; const out:any[]=[];
  for (const s of segments){
    // naive toggle on pauses / punctuation
    if (/[?.!]
$/.test(s.text)) current = current==='A'?'B':'A';
    out.push({ ...s, speaker: current });
  }
  return out;
}