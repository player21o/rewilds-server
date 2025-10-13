import {
  getClosestPointOnSegment,
  isPointInEllipse,
  normalizeAngle,
} from "../utils";

export type CollisionResponse = {
  a: CollisionObject;
  b: CollisionObject;
  vector_a: [number, number];
  vector_b: [number, number];
};

export class Collisions {
  public cell_size = 16;
  public cells: Set<number>[][] = [];
  private non_empty_cells: Set<Set<number>> = new Set();
  public objects: { [id: number]: CollisionObject } = {};

  constructor(width: number, height: number) {
    for (let x = 0; x < Math.ceil(width / this.cell_size) + 1; x++) {
      this.cells.push([]);

      for (let y = 0; y < Math.ceil(height / this.cell_size) + 1; y++) {
        this.cells[x].push(new Set());
      }
    }
  }

  public set_cell(x: number, y: number, id: number) {
    if (x > this.cells.length - 1 || x < 0 || y > this.cells[0].length || y < 0)
      return;
    this.cells[x][y].add(id);
    this.non_empty_cells.add(this.cells[x][y]);

    return this.cells[x][y];
  }

  public remove_id_from_cell(
    x: number,
    y: number,
    id: number,
    cell?: Set<number>
  ) {
    const c = cell != undefined ? cell : this.cells[x][y];

    c.delete(id);
    if (c.size == 0) this.non_empty_cells.delete(c);
  }

  public remove_id_from_cell_ref(cell: Set<number>, id: number) {
    cell.delete(id);

    if (cell.size === 0) {
      this.non_empty_cells.delete(cell);
    }
  }

  public clear_cell(x: number, y: number, cell?: Set<number>) {
    const c = cell != undefined ? cell : this.cells[x][y];

    c.clear();
    this.non_empty_cells.delete(c);
  }

  public insert(obj: CollisionObject) {
    this.objects[obj.id] = obj;
    obj.build(this);
  }

  public remove(obj: CollisionObject | number) {
    const o = obj instanceof CollisionObject ? obj : this.objects[obj];

    o.clear(this);
    o.disabled = true;
    delete this.objects[o.id];
  }

  public check() {
    const checkedPairs = new Set<string>();
    const collisions: number[][] = [];

    this.non_empty_cells.forEach((cell) => {
      if (cell.size < 2) {
        return;
      }

      const objectsInCell = Array.from(cell);

      for (let i = 0; i < objectsInCell.length; i++) {
        for (let j = i + 1; j < objectsInCell.length; j++) {
          const id1 = objectsInCell[i];
          const id2 = objectsInCell[j];

          const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

          if (!checkedPairs.has(key)) {
            collisions.push([id1, id2]);
            checkedPairs.add(key);
          }
        }
      }
    });

    return collisions;
  }
}

export class CollisionObject {
  public id: number;
  public x: number;
  public y: number;
  public type = "object";
  private cells: Set<Set<number>> = new Set();
  public disabled = false;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  protected set_cell(c: Collisions, x: number, y: number) {
    const cell = c.set_cell(x, y, this.id);
    if (cell != undefined) this.cells.add(cell);
  }
  //@ts-ignore
  public build(c: Collisions) {}
  public clear(c: Collisions) {
    this.cells.forEach((cell) => c.remove_id_from_cell_ref(cell, this.id));
    this.cells.clear();
  }
  public update(c: Collisions) {
    if (this.disabled) return;
    this.clear(c);
    this.build(c);
  }
  public destroy(c: Collisions) {
    c.remove(this);
  }
}

export function box_to_box_collision(a: Box, b: Box): CollisionResponse | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const combinedHalfWidths = a.width / 2 + b.width / 2;
  const combinedHalfHeights = a.height / 2 + b.height / 2;

  const overlapX = combinedHalfWidths - Math.abs(dx);
  const overlapY = combinedHalfHeights - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) {
    return null;
  }

  let vector_a: [number, number] = [0, 0];
  let vector_b: [number, number] = [0, 0];

  if (overlapX < overlapY) {
    const push = overlapX / 2;

    if (dx > 0) {
      vector_a[0] = -push;
      vector_b[0] = push;
    } else {
      vector_a[0] = push;
      vector_b[0] = -push;
    }
  } else {
    const push = overlapY / 2;

    if (dy > 0) {
      vector_a[1] = -push;
      vector_b[1] = push;
    } else {
      vector_a[1] = push;
      vector_b[1] = -push;
    }
  }

  return { a, b, vector_a, vector_b };
}

/*

function circle_to_circle_collision(
  c1: Circle,
  c2: Circle
): CollisionResponse | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  const distanceSq = dx * dx + dy * dy;
  const sumRadii = c1.radius + c2.radius;

  if (distanceSq >= sumRadii * sumRadii) {
    return null;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = sumRadii - distance;

  if (distance === 0) {
    //return {
    //  resolution1: { x: -overlap / 2, y: 0 },
    //  resolution2: { x: overlap / 2, y: 0 },
    //};
    return {
      a: c1,
      b: c2,
      vector_a: [-overlap / 2, 0],
      vector_b: [overlap / 2, 0],
    };
  }

  const pushX = (dx / distance) * overlap;
  const pushY = (dy / distance) * overlap;

  //
  return {
    resolution1: { x: -pushX / 2, y: -pushY / 2 },
    resolution2: { x: pushX / 2, y: pushY / 2 },
  };
  //

  return {
    a: c1,
    b: c2,
    vector_a: [-pushX / 2, -pushY / 2],
    vector_b: [pushX / 2, pushY / 2],
  };
}
*/

// Alternative, potentially simpler implementation
function circle_to_circle_collision(
  c1: Circle,
  c2: Circle
): CollisionResponse | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  const c1_rx = c1.radiusX;
  const c1_ry = c1.radiusY;
  const c2_rx = c2.radiusX;
  const c2_ry = c2.radiusY;

  const sumRX = c1_rx + c2_rx;
  const sumRY = c1_ry + c2_ry;

  if (sumRX === 0 || sumRY === 0) return null;

  const transformedDx = dx / sumRX;
  const transformedDy = dy / sumRY;

  const distanceSq =
    transformedDx * transformedDx + transformedDy * transformedDy;

  if (distanceSq >= 1) {
    return null;
  }

  if (distanceSq === 0) {
    return {
      a: c1,
      b: c2,
      vector_a: [-sumRX / 2, 0],
      vector_b: [sumRX / 2, 0],
    };
  }

  const distance = Math.sqrt(distanceSq);

  const overlap = 1.0 - distance;

  const pushX_t = (transformedDx / distance) * overlap;
  const pushY_t = (transformedDy / distance) * overlap;

  const pushX = pushX_t * sumRX;
  const pushY = pushY_t * sumRY;

  return {
    a: c1,
    b: c2,
    vector_a: [-pushX / 2, -pushY / 2], // c1 gets pushed away from c2
    vector_b: [pushX / 2, pushY / 2], // c2 gets pushed away from c1
  };
}

function box_to_circle_collision(
  rect: Box,
  circle: Circle
): CollisionResponse | null {
  if (circle.squeezeY === 1.0) {
    const rectHalfWidth = rect.width / 2;
    const rectHalfHeight = rect.height / 2;

    const closestX = Math.max(
      rect.x - rectHalfWidth,
      Math.min(circle.x, rect.x + rectHalfWidth)
    );
    const closestY = Math.max(
      rect.y - rectHalfHeight,
      Math.min(circle.y, rect.y + rectHalfHeight)
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    const distanceSq = dx * dx + dy * dy;

    if (distanceSq >= circle.radius * circle.radius) {
      return null;
    }

    const distance = Math.sqrt(distanceSq);
    const overlap = circle.radius - distance;

    if (distance === 0) {
      const overlapX =
        rectHalfWidth + circle.radius - Math.abs(circle.x - rect.x);
      const overlapY =
        rectHalfHeight + circle.radius - Math.abs(circle.y - rect.y);

      if (overlapX < overlapY) {
        const push = circle.x > rect.x ? overlapX : -overlapX;

        return {
          a: rect,
          b: circle,
          vector_a: [-push / 2, 0],
          vector_b: [push / 2, 0],
        };
      } else {
        const push = circle.y > rect.y ? overlapY : -overlapY;
        return {
          a: rect,
          b: circle,
          vector_a: [0, -push / 2],
          vector_b: [0, push / 2],
        };
      }
    }

    const pushX = (dx / distance) * overlap;
    const pushY = (dy / distance) * overlap;

    return {
      a: rect,
      b: circle,
      vector_a: [-pushX / 2, -pushY / 2],
      vector_b: [pushX / 2, pushY / 2],
    };
  }

  const scaleY = 1 / circle.squeezeY;

  const rectCenterY_t = rect.y * scaleY;
  const circleCenterY_t = circle.y * scaleY;

  const rectHalfHeight_t = (rect.height / 2) * scaleY;

  const circleRadius_t = circle.radiusX;

  const closestX = Math.max(
    rect.x - rect.width / 2,
    Math.min(circle.x, rect.x + rect.width / 2)
  );
  const closestY_t = Math.max(
    rectCenterY_t - rectHalfHeight_t,
    Math.min(circleCenterY_t, rectCenterY_t + rectHalfHeight_t)
  );

  const dx = circle.x - closestX;
  const dy_t = circleCenterY_t - closestY_t;
  const distanceSq_t = dx * dx + dy_t * dy_t;

  if (distanceSq_t >= circleRadius_t * circleRadius_t) {
    return null;
  }

  const distance_t = Math.sqrt(distanceSq_t);
  const overlap_t = circleRadius_t - distance_t;

  if (distance_t === 0) {
    const overlapX =
      rect.width / 2 + circle.radiusX - Math.abs(circle.x - rect.x);
    const overlapY =
      rect.height / 2 + circle.radiusY - Math.abs(circle.y - rect.y);

    if (overlapX < overlapY) {
      const push = circle.x > rect.x ? overlapX : -overlapX;
      return {
        a: rect,
        b: circle,
        vector_a: [-push / 2, 0],
        vector_b: [push / 2, 0],
      };
    } else {
      const push = circle.y > rect.y ? overlapY : -overlapY;
      return {
        a: rect,
        b: circle,
        vector_a: [0, -push / 2],
        vector_b: [0, push / 2],
      };
    }
  }

  const pushX_t = (dx / distance_t) * overlap_t;
  const pushY_t = (dy_t / distance_t) * overlap_t;

  const pushX = pushX_t;
  const pushY = pushY_t / scaleY;

  return {
    a: rect,
    b: circle,
    vector_a: [-pushX / 2, -pushY / 2],
    vector_b: [pushX / 2, pushY / 2],
  };
}

/*
function box_to_circle_collision(
  rect: Box,
  circle: Circle
): CollisionResponse | null {
  const rectHalfWidth = rect.width / 2;
  const rectHalfHeight = rect.height / 2;

  const closestX = Math.max(
    rect.x - rectHalfWidth,
    Math.min(circle.x, rect.x + rectHalfWidth)
  );
  const closestY = Math.max(
    rect.y - rectHalfHeight,
    Math.min(circle.y, rect.y + rectHalfHeight)
  );

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= circle.radius * circle.radius) {
    return null;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = circle.radius - distance;

  if (distance === 0) {
    const overlapX =
      rectHalfWidth + circle.radius - Math.abs(circle.x - rect.x);
    const overlapY =
      rectHalfHeight + circle.radius - Math.abs(circle.y - rect.y);

    if (overlapX < overlapY) {
      const push = circle.x > rect.x ? overlapX : -overlapX;
      //return {
      //  resolution1: { x: -push / 2, y: 0 }, // rect
      //  resolution2: { x: push / 2, y: 0 }, // circle
      //};

      return {
        a: rect,
        b: circle,
        vector_a: [-push / 2, 0],
        vector_b: [push / 2, 0],
      };
    } else {
      const push = circle.y > rect.y ? overlapY : -overlapY;
      //return {
      //  resolution1: { x: 0, y: -push / 2 }, // rect
      //  resolution2: { x: 0, y: push / 2 }, // circle
      //};
      return {
        a: rect,
        b: circle,
        vector_a: [0, -push / 2],
        vector_b: [0, push / 2],
      };
    }
  }

  const pushX = (dx / distance) * overlap;
  const pushY = (dy / distance) * overlap;

  //return {
  // The rectangle gets pushed in the opposite direction of the circle
  //  resolution1: { x: -pushX / 2, y: -pushY / 2 },
  // The circle gets pushed away from the closest point
  //  resolution2: { x: pushX / 2, y: pushY / 2 },
  //};
  return {
    a: rect,
    b: circle,
    vector_a: [-pushX / 2, -pushY / 2],
    vector_b: [pushX / 2, pushY / 2],
  };
}
  */

// --- THE DEBUGGING VERSION OF THE FUNCTION ---

// NOTE: This uses the `getClosestPointOnSegment` helper from the previous attempt.

// Your main collision function now just calls this for detection.
// We will add the resolution logic back here LATER.
// Make sure you have these helpers from the last attempt:
// - normalizeAngle(angle)
// - isPointInEllipse(point, ellipse)
// - getClosestPointOnSegment(point, line_start, line_end)

function arc_vs_ellipse_detection(arc: Arc, ellipse: Circle): boolean {
  // --- CHECK 1: Is the ellipse's center inside the arc's shape? ---
  // This handles cases where the ellipse is "inside" the arc's donut shape.
  if (isPointInArc({ x: ellipse.x, y: ellipse.y }, arc)) {
    return true;
  }

  // --- CHECK 2: Is the closest point on the arc's boundary inside the ellipse? ---
  // This is the most important check and handles all other collision types.

  // 2a. Find the point on the arc's boundary that is closest to the ellipse's center.
  // This re-uses the excellent logic you already wrote in your resolution function.
  const dx = ellipse.x - arc.x;
  const dy = ellipse.y - arc.y;

  const distSqToCenter = dx * dx + dy * dy;

  // If arc center and ellipse center are the same, they must be colliding
  // (since check 1 would have failed, it means the origin is not within the radii,
  // so the shapes must overlap).
  if (distSqToCenter < 1e-9) {
    return true;
  }

  const angleToEllipse = Math.atan2(dy, dx);
  const relativeAngle = normalizeAngle(angleToEllipse - arc.direction);
  const halfSweep = arc.sweepAngle / 2;

  let closestArcPoint: { x: number; y: number };

  // Determine if the closest point is on the curved sweeps or the flat end-caps.
  if (Math.abs(relativeAngle) <= halfSweep) {
    // The closest point is on one of the curved edges (inner or outer radius).
    // We clamp the distance from the arc's center to be between the inner and outer radius.
    const distToCenter = Math.sqrt(distSqToCenter);
    const clampedRadius = Math.max(
      arc.innerRadius,
      Math.min(distToCenter, arc.outerRadius)
    );
    closestArcPoint = {
      x: arc.x + Math.cos(angleToEllipse) * clampedRadius,
      y: arc.y + Math.sin(angleToEllipse) * clampedRadius,
    };
  } else {
    // The closest point is on one of the flat end-cap segments.
    // We need to check which of the two end-caps is closer.
    const startAngle = arc.startAngle;
    const endAngle = arc.endAngle;

    const s1 = {
      x: arc.x + Math.cos(startAngle) * arc.innerRadius,
      y: arc.y + Math.sin(startAngle) * arc.innerRadius,
    };
    const s2 = {
      x: arc.x + Math.cos(startAngle) * arc.outerRadius,
      y: arc.y + Math.sin(startAngle) * arc.outerRadius,
    };
    const e1 = {
      x: arc.x + Math.cos(endAngle) * arc.innerRadius,
      y: arc.y + Math.sin(endAngle) * arc.innerRadius,
    };
    const e2 = {
      x: arc.x + Math.cos(endAngle) * arc.outerRadius,
      y: arc.y + Math.sin(endAngle) * arc.outerRadius,
    };

    const startEdgeInfo = getClosestPointOnSegment(
      { x: ellipse.x, y: ellipse.y },
      s1,
      s2
    );
    const endEdgeInfo = getClosestPointOnSegment(
      { x: ellipse.x, y: ellipse.y },
      e1,
      e2
    );

    closestArcPoint =
      startEdgeInfo.distanceSq < endEdgeInfo.distanceSq
        ? startEdgeInfo.closestPoint
        : endEdgeInfo.closestPoint;
  }

  // 2b. Now that we have the closest point on the arc, check if it's inside the ellipse.
  return isPointInEllipse(closestArcPoint, ellipse);
}

function arc_to_circle_collision(
  arc: Arc,
  circle: Circle
): CollisionResponse | null {
  // --- STEP 1: DETECTION ---
  // Use our proven, reliable detector first. If no collision, we're done.
  const isColliding = arc_vs_ellipse_detection(arc, circle);
  if (!isColliding) {
    return null;
  }

  // --- STEP 2: RESOLUTION (Calculate the Push Vector) ---
  // We know they are colliding. Now we find the Minimum Translation Vector (MTV).

  // 2a. Find the closest point on the arc's boundary to the ellipse's center.
  // This re-uses the exact same logic from our successful detector, ensuring consistency.
  const dx = circle.x - arc.x;
  const dy = circle.y - arc.y;
  const angleToCircle = Math.atan2(dy, dx);
  const relativeAngle = normalizeAngle(angleToCircle - arc.direction);
  const halfSweep = arc.sweepAngle / 2;

  let closestArcPoint: { x: number; y: number };

  if (Math.abs(relativeAngle) <= halfSweep) {
    // Region 1: Middle Sweep
    const distance = Math.sqrt(dx * dx + dy * dy);
    const distToInner = Math.abs(distance - arc.innerRadius);
    const distToOuter = Math.abs(distance - arc.outerRadius);
    const boundaryRadius =
      distToInner < distToOuter ? arc.innerRadius : arc.outerRadius;
    closestArcPoint = {
      x: arc.x + Math.cos(angleToCircle) * boundaryRadius,
      y: arc.y + Math.sin(angleToCircle) * boundaryRadius,
    };
  } else {
    // Region 2 & 3: End Caps
    const startAngle = arc.startAngle;
    const endAngle = arc.endAngle;
    const s1 = {
      x: arc.x + Math.cos(startAngle) * arc.innerRadius,
      y: arc.y + Math.sin(startAngle) * arc.innerRadius,
    };
    const s2 = {
      x: arc.x + Math.cos(startAngle) * arc.outerRadius,
      y: arc.y + Math.sin(startAngle) * arc.outerRadius,
    };
    const e1 = {
      x: arc.x + Math.cos(endAngle) * arc.innerRadius,
      y: arc.y + Math.sin(endAngle) * arc.innerRadius,
    };
    const e2 = {
      x: arc.x + Math.cos(endAngle) * arc.outerRadius,
      y: arc.y + Math.sin(endAngle) * arc.outerRadius,
    };

    const startEdgeInfo = getClosestPointOnSegment(
      { x: circle.x, y: circle.y },
      s1,
      s2
    );
    const endEdgeInfo = getClosestPointOnSegment(
      { x: circle.x, y: circle.y },
      e1,
      e2
    );

    closestArcPoint =
      startEdgeInfo.distanceSq < endEdgeInfo.distanceSq
        ? startEdgeInfo.closestPoint
        : endEdgeInfo.closestPoint;
  }

  // 2b. Calculate the push vector based on this closest point.
  const vecToCircleX = circle.x - closestArcPoint.x;
  const vecToCircleY = circle.y - closestArcPoint.y;
  const vecToCircleMag = Math.sqrt(
    vecToCircleX * vecToCircleX + vecToCircleY * vecToCircleY
  );

  // Find the ellipse's radius in the direction of the push.
  const vecToCircleAngle = Math.atan2(vecToCircleY, vecToCircleX);
  const sin = Math.sin(vecToCircleAngle);
  const cos = Math.cos(vecToCircleAngle);
  const radiusAtAngle = Math.sqrt(
    1 / ((cos / circle.radiusX) ** 2 + (sin / circle.radiusY) ** 2)
  );

  // 2c. Calculate the overlap magnitude.
  const overlap = radiusAtAngle - vecToCircleMag;

  let pushX: number, pushY: number;

  if (vecToCircleMag < 1e-9) {
    // Deep penetration: push out from arc center as a fallback
    const fallbackMag = Math.sqrt(dx * dx + dy * dy) || 1;
    pushX = (dx / fallbackMag) * radiusAtAngle;
    pushY = (dy / fallbackMag) * radiusAtAngle;
  } else {
    // Normal push: move by the overlap amount along the vector
    pushX = (vecToCircleX / vecToCircleMag) * overlap;
    pushY = (vecToCircleY / vecToCircleMag) * overlap;
  }

  return {
    a: arc,
    b: circle,
    vector_a: [-pushX / 2, -pushY / 2], // Push arc AWAY from circle
    vector_b: [pushX / 2, pushY / 2], // Push circle AWAY from arc
  };
}

// Helper function from before
function isPointInArc(p: { x: number; y: number }, arc: Arc): boolean {
  const dx = p.x - arc.x;
  const dy = p.y - arc.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq < arc.innerRadius ** 2 || distanceSq > arc.outerRadius ** 2) {
    return false;
  }
  const angle = Math.atan2(dy, dx);
  const relativeAngle = normalizeAngle(angle - arc.direction);
  return Math.abs(relativeAngle) <= arc.sweepAngle / 2;
}

function arc_to_box_collision(arc: Arc, box: Box): CollisionResponse | null {
  // --- Step 1: Find the point on the Box closest to the Arc's center ---
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const closestBoxX = Math.max(box.x - halfW, Math.min(arc.x, box.x + halfW));
  const closestBoxY = Math.max(box.y - halfH, Math.min(arc.y, box.y + halfH));

  // --- Step 2: Find the point on the Arc closest to that point on the Box ---
  // This logic is identical to the arc-vs-circle logic, where the "circle"
  // is the closestBoxPoint and has a radius of 0.
  const dx = closestBoxX - arc.x;
  const dy = closestBoxY - arc.y;

  const angleToBoxPoint = Math.atan2(dy, dx);
  let relativeAngle = normalizeAngle(angleToBoxPoint - arc.direction);

  const halfSweep = arc.sweepAngle / 2;
  const clampedAngle = Math.max(-halfSweep, Math.min(relativeAngle, halfSweep));

  const finalAngle = clampedAngle + arc.direction;

  const distToBoxPoint = Math.sqrt(dx * dx + dy * dy);
  const clampedDist = Math.max(
    arc.innerRadius,
    Math.min(distToBoxPoint, arc.outerRadius)
  );

  const closestArcX = arc.x + Math.cos(finalAngle) * clampedDist;
  const closestArcY = arc.y + Math.sin(finalAngle) * clampedDist;

  // --- Step 3: Check for collision and get the MTV ---
  // The MTV is the vector from the closest point on the arc to the closest point on the box.
  const mtvX = closestBoxX - closestArcX;
  const mtvY = closestBoxY - closestArcY;

  const mtvMagSq = mtvX * mtvX + mtvY * mtvY;

  // If the closest points are the same, they are overlapping.
  // However, this check alone isn't enough. We also need to check if the
  // box's closest point is inside the arc.
  const isInside =
    distToBoxPoint >= arc.innerRadius &&
    distToBoxPoint <= arc.outerRadius &&
    Math.abs(relativeAngle) <= halfSweep;

  if (mtvMagSq > 1e-9) {
    // If they are not touching, no collision. 1e-9 is a small epsilon.
    // The only exception is if the box fully contains the arc's origin.
    if (!isInside) return null;
  }

  // If we're here, they are colliding. The MTV we found is the push vector.
  // But which way does it push? We need to push the arc away from the box.
  const mtvMag = Math.sqrt(mtvMagSq);

  // If the magnitude is zero (deep penetration), we need a fallback.
  if (mtvMag === 0) {
    // Push out from center of arc towards center of box
    const fallbackDx = box.x - arc.x;
    const fallbackDy = box.y - arc.y;
    const fallbackMag =
      Math.sqrt(fallbackDx * fallbackDx + fallbackDy * fallbackDy) || 1;
    const overlap = 1; // Arbitrary small push
    const pushX = (fallbackDx / fallbackMag) * overlap;
    const pushY = (fallbackDy / fallbackMag) * overlap;
    return {
      a: arc,
      b: box,
      vector_a: [-pushX / 2, -pushY / 2],
      vector_b: [pushX / 2, pushY / 2],
    };
  }

  // The push vector to move the arc is the *opposite* of the MTV.
  const pushX = -mtvX;
  const pushY = -mtvY;

  return {
    a: arc,
    b: box,
    // The arc (a) gets pushed by the opposite of the mtv
    vector_a: [pushX / 2, pushY / 2],
    // The box (b) gets pushed by the mtv itself
    vector_b: [-pushX / 2, -pushY / 2],
  };
}

export function build_collision_response(
  a: CollisionObject,
  b: CollisionObject
): CollisionResponse | null {
  if (a.type == "box" && b.type == "box") {
    return box_to_box_collision(a as Box, b as Box);
  } else if (a.type == "circle" && b.type == "circle") {
    return circle_to_circle_collision(a as Circle, b as Circle);
  } else if (a.type == "box" && b.type == "circle") {
    return box_to_circle_collision(a as Box, b as Circle);
  } else if (a.type == "circle" && b.type == "box") {
    const swapped_response = box_to_circle_collision(b as Box, a as Circle);

    if (swapped_response) {
      return {
        a: a,
        b: b,
        vector_a: swapped_response.vector_b,
        vector_b: swapped_response.vector_a,
      };
    }
  } else if (a.type == "arc" && b.type == "box") {
    return arc_to_box_collision(a as Arc, b as Box);
  } else if (a.type == "box" && b.type == "arc") {
    const result = arc_to_box_collision(b as Arc, a as Box);
    if (result) {
      // Remember to swap the response vectors!
      return {
        a: a,
        b: b,
        vector_a: result.vector_b,
        vector_b: result.vector_a,
      };
    }
    return null;
  } else if (a.type == "arc" && b.type == "circle") {
    // For now, we ignore the circle's squeeze factor for this collision type.
    return arc_to_circle_collision(a as Arc, b as Circle);
  } else if (a.type == "circle" && b.type == "arc") {
    const result = arc_to_circle_collision(b as Arc, a as Circle);
    // Remember to swap the response vectors!
    if (result) {
      return {
        a: a,
        b: b,
        vector_a: result.vector_b,
        vector_b: result.vector_a,
      };
    }
    return null;
  }

  return null;
}

export class Box extends CollisionObject {
  public width: number;
  public height: number;
  public type = "box";

  constructor(id: number, x: number, y: number, width: number, height: number) {
    super(id, x, y);

    this.width = width;
    this.height = height;
  }

  public build(c: Collisions): void {
    const left_up_corner_world = [
      this.x - this.width / 2,
      this.y - this.height / 2,
    ];
    const right_down_corner_world = [
      this.x + this.width / 2,
      this.y + this.height / 2,
    ];

    const left_up_corner_cells = [
      Math.floor(left_up_corner_world[0] / c.cell_size),
      Math.floor(left_up_corner_world[1] / c.cell_size),
    ];

    const right_down_corner_cells = [
      Math.ceil(right_down_corner_world[0] / c.cell_size),
      Math.ceil(right_down_corner_world[1] / c.cell_size),
    ];

    for (
      let x = left_up_corner_cells[0];
      x < right_down_corner_cells[0] + 1;
      x++
    ) {
      for (
        let y = left_up_corner_cells[1];
        y < right_down_corner_cells[1] + 1;
        y++
      ) {
        if (x > c.cells.length)
          console.log(x, left_up_corner_cells, right_down_corner_cells);
        this.set_cell(c, x, y);
      }
    }
  }
}

export class Circle extends CollisionObject {
  public radius: number;
  public type = "circle";
  public squeezeY: number;

  constructor(id: number, x: number, y: number, radius: number, squeezeY = 1) {
    super(id, x, y);

    this.radius = radius;
    this.squeezeY = squeezeY;
  }

  public build(c: Collisions): void {
    const minX = this.x - this.radiusX;
    const minY = this.y - this.radiusY;
    const maxX = this.x + this.radiusX;
    const maxY = this.y + this.radiusY;

    const startX = Math.floor(minX / c.cell_size);
    const startY = Math.floor(minY / c.cell_size);
    const endX = Math.floor(maxX / c.cell_size);
    const endY = Math.floor(maxY / c.cell_size);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        // Safety check to ensure we don't write outside the grid
        if (
          x >= 0 &&
          x < c.cells.length &&
          c.cells[x] &&
          y >= 0 &&
          y < c.cells[x].length
        ) {
          this.set_cell(c, x, y);
        }
      }
    }
  }

  get radiusX(): number {
    return this.radius;
  }

  get radiusY(): number {
    return this.radius * this.squeezeY;
  }
}

// Add this class to your project

export class Arc extends CollisionObject {
  public innerRadius: number;
  public thickness: number; //thickness of the arc ring
  public direction: number; //center angle of the arc in radians
  public sweepAngle: number; // total angle of the arc in radians ("range")
  public type = "arc";

  constructor(
    id: number,
    x: number,
    y: number,
    innerRadius: number,
    thickness: number,
    direction: number,
    sweepAngle: number
  ) {
    super(id, x, y);
    this.innerRadius = innerRadius;
    this.thickness = thickness;
    this.direction = direction;
    this.sweepAngle = sweepAngle;
  }

  get outerRadius(): number {
    return this.innerRadius + this.thickness;
  }

  get startAngle(): number {
    return this.direction - this.sweepAngle / 2;
  }

  get endAngle(): number {
    return this.direction + this.sweepAngle / 2;
  }

  public build(c: Collisions): void {
    const r = this.outerRadius; // Use the furthest possible point for the bounding box
    const minX = this.x - r;
    const minY = this.y - r;
    const maxX = this.x + r;
    const maxY = this.y + r;

    const startX = Math.floor(minX / c.cell_size);
    const startY = Math.floor(minY / c.cell_size);
    const endX = Math.floor(maxX / c.cell_size);
    const endY = Math.floor(maxY / c.cell_size);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        // Safety check
        if (
          x >= 0 &&
          x < c.cells.length &&
          c.cells[x] &&
          y >= 0 &&
          y < c.cells[x].length
        ) {
          this.set_cell(c, x, y);
        }
      }
    }
  }
}
