export const TILE_OES_ENABLED = process.env.TILE_OES_ENABLED === "true";
export const OES_MODE = process.env.OES_MODE || "advisory"; // 'advisory' | 'active'
export const PSP_ENABLED = process.env.PSP_ENABLED === "true";

export const OES_FLAGS = {
  TILE_OES_ENABLED,
  OES_MODE,
  PSP_ENABLED,
};
