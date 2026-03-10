export interface TerrainCell {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  wind_u: number;
  wind_v: number;
  turbulence: number;
  storm_score: number;
}

export function computeTerrainCells(args: {
  tsBucket: string;
  narrativeId: string;
  h3: string;
  volume: number;
  emotionArousal: number;
  contradiction: number;
  windU?: number;
  windV?: number;
}): TerrainCell {
  const pressure = args.volume;
  const temperature = args.emotionArousal;
  const turbulence = args.contradiction;
  const storm_score = Math.min(1, (pressure * 0.02) + (temperature * 0.6));

  return {
    id: `cell:${args.tsBucket}:${args.h3}:${args.narrativeId}`,
    ts_bucket: args.tsBucket,
    h3: args.h3,
    narrative_id: args.narrativeId,
    pressure,
    temperature,
    wind_u: args.windU ?? 0,
    wind_v: args.windV ?? 0,
    turbulence,
    storm_score,
  };
}
