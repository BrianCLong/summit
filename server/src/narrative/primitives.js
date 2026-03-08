"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorClass = void 0;
exports.isSwarmCandidate = isSwarmCandidate;
// --- 3. Actor Class ---
// Classification of the entity propagating the narrative.
var ActorClass;
(function (ActorClass) {
    ActorClass["HUMAN"] = "HUMAN";
    ActorClass["BOT_SIMPLE"] = "BOT_SIMPLE";
    ActorClass["BOT_SOPHISTICATED"] = "BOT_SOPHISTICATED";
    ActorClass["SWARM_NODE"] = "SWARM_NODE";
    ActorClass["CYBORG"] = "CYBORG";
    ActorClass["STATE_ACTOR"] = "STATE_ACTOR";
    ActorClass["USEFUL_IDIOT"] = "USEFUL_IDIOT";
})(ActorClass || (exports.ActorClass = ActorClass = {}));
/**
 * Helper to determine if an Actor is likely part of a Swarm based on primitives.
 */
function isSwarmCandidate(actor, path, amp) {
    if (actor.classification === ActorClass.SWARM_NODE)
        return true;
    // Heuristic: High coordination + High semantic divergence (AI) + Fast velocity
    if (path.temporalCoordinationScore > 0.85 && amp.semanticDivergence > 0.6) {
        return true;
    }
    return false;
}
