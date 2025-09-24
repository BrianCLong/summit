export * from "./linearx";
export const RESOURCE_KINDS = {
    MODEL: "model",
    RUNTIME: "runtime",
    HARDWARE: "hardware"
};
export const SAFETY_TIERS = { A: "A", B: "B", C: "C" };
export const LICENSE_CLASSES = {
    MIT_OK: "MIT-OK",
    OPEN_DATA_OK: "Open-Data-OK",
    RESTRICTED_TOS: "Restricted-TOS"
};
export const ZERO_SPEND_OPTIMIZATIONS = {
    KV_CACHE: "kvCache",
    MEMOIZATION: "memo",
    QUANTIZATION: "quant",
    SPECULATIVE_DECODE: "specDecode",
    BATCHING: "batching",
    VLLM: "vLLM",
    LORA: "LoRA"
};
