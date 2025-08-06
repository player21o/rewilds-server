export function lookAt(a: number, b: number, c: number, d: number) {
  var angle = Math.atan2(d - b, c - a);
  if (angle < 0) angle = Math.PI * 2 + angle;

  return angle;
}

export function normalizeAngle(angle: number): number {
  return angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
}
