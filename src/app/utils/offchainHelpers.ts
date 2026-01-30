export function getRoundDurationSeconds(): number {
  return 60; // 1 minute rounds
}

export function getAlignedRoundId(nowMs: number = Date.now()): number {
  const duration = getRoundDurationSeconds();
  return Math.floor(nowMs / (duration * 1000)) * duration;
}


