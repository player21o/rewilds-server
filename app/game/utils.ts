import type { Arc, Circle } from "./entities/collisions";

export function lookAt(a: number, b: number, c: number, d: number) {
  var angle = Math.atan2(d - b, c - a);
  if (angle < 0) angle = Math.PI * 2 + angle;

  return angle;
}

export function normalizeAngle(angle: number): number {
  return angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
}

/**
 * Finds the squared distance and closest point from a point `p` to a line segment `(a, b)`.
 * @returns An object { distanceSq: number, closestPoint: {x: number, y: number} }
 */
export function getClosestPointOnSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };

  const ab_dot_ab = ab.x * ab.x + ab.y * ab.y;
  if (ab_dot_ab === 0) {
    // a and b are the same point
    return { distanceSq: ap.x * ap.x + ap.y * ap.y, closestPoint: a };
  }

  const ab_dot_ap = ab.x * ap.x + ab.y * ap.y;
  const t = Math.max(0, Math.min(1, ab_dot_ap / ab_dot_ab));

  const closestPoint = { x: a.x + t * ab.x, y: a.y + t * ab.y };
  const pc = { x: p.x - closestPoint.x, y: p.y - closestPoint.y };
  return { distanceSq: pc.x * pc.x + pc.y * pc.y, closestPoint };
}

// HELPER 1: Checks if a point is inside an ellipse. This is rock-solid.
export function isPointInEllipse(
  p: { x: number; y: number },
  ellipse: Circle
): boolean {
  // Vector from ellipse center to the point
  const dx = p.x - ellipse.x;
  const dy = p.y - ellipse.y;

  // The ellipse formula: (x/a)^2 + (y/b)^2 <= 1
  // To avoid division by zero
  if (ellipse.radiusX === 0 || ellipse.radiusY === 0) return false;

  const normalized = (dx / ellipse.radiusX) ** 2 + (dy / ellipse.radiusY) ** 2;
  return normalized <= 1;
}

// HELPER 2: Checks if a point is inside the ARC's boundary shape.
export function isPointInArc(p: { x: number; y: number }, arc: Arc): boolean {
  const dx = p.x - arc.x;
  const dy = p.y - arc.y;

  const distanceSq = dx * dx + dy * dy;

  // Check 1: Is the distance from the center correct?
  if (distanceSq < arc.innerRadius ** 2 || distanceSq > arc.outerRadius ** 2) {
    return false;
  }

  // Check 2: Is the angle correct?
  const angle = Math.atan2(dy, dx);
  const relativeAngle = normalizeAngle(angle - arc.direction);

  return Math.abs(relativeAngle) <= arc.sweepAngle / 2;
}

export type ToPrimitive<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends null
  ? null
  : T extends undefined
  ? undefined
  : T extends boolean
  ? boolean
  : T extends bigint
  ? bigint
  : T extends symbol
  ? symbol
  : {
      [K in keyof T]: ToPrimitive<T[K]>;
    };
