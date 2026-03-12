export const MAX_SELF_HEAL_ATTEMPTS = 1;
export const MAX_OPEN_AUTONOMOUS_PRS = 1;
export function canSelfHeal(attempts) {
    return attempts < MAX_SELF_HEAL_ATTEMPTS;
}
