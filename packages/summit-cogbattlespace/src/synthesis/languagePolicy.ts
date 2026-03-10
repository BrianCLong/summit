import type { LaneBadge, SynthesizedClaimStrength } from "./types";

export function strengthForLane(lane: LaneBadge): SynthesizedClaimStrength {
  switch (lane) {
    case "PROMOTED":
      return "CANONICAL";
    case "TRUSTED":
      return "STRONG";
    case "OBSERVED":
      return "PROVISIONAL";
    case "CANDIDATE":
      return "PRELIMINARY";
  }
}

export function prefixForLane(lane: LaneBadge): string {
  switch (lane) {
    case "PROMOTED":
      return "[PROMOTED]";
    case "TRUSTED":
      return "[TRUSTED]";
    case "OBSERVED":
      return "[OBSERVED]";
    case "CANDIDATE":
      return "[CANDIDATE]";
  }
}

export function wordingRuleForLane(lane: LaneBadge): {
  allowDefinitive: boolean;
  verb: string;
  note?: string;
} {
  switch (lane) {
    case "PROMOTED":
      return {
        allowDefinitive: true,
        verb: "shows"
      };
    case "TRUSTED":
      return {
        allowDefinitive: false,
        verb: "strongly suggests",
        note: "Avoid presenting as final canonical fact."
      };
    case "OBSERVED":
      return {
        allowDefinitive: false,
        verb: "indicates",
        note: "Frame as developing or observed signal."
      };
    case "CANDIDATE":
      return {
        allowDefinitive: false,
        verb: "may indicate",
        note: "Must not be phrased as established fact."
      };
  }
}
