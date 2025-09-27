export function emitSpeechResult(transcript: string, idx?: number) {
  const arr = (window as any).__srInstances as any[];
  const inst = typeof idx === "number" ? arr[idx] : arr[arr.length - 1];
  if (!inst) throw new Error("No SpeechRecognition instance to emit to");
  inst.onresult?.({ results: [[[{ transcript }]]] });
  inst.onend?.();
}
