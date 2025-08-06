import { normalizeAngle } from "../utils";

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

  private clear_cell(x: number, y: number, cell?: Set<number>) {
    const c = cell != undefined ? cell : this.cells[x][y];

    c.clear();
    this.non_empty_cells.delete(c);
  }

  public insert(obj: CollisionObject) {
    this.objects[obj.id] = obj;
    obj.build(this);
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

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  protected set_cell(c: Collisions, x: number, y: number) {
    const cell = c.set_cell(x, y, this.id);
    if (cell != undefined) this.cells.add(cell);
  }
  public build(c: Collisions) {}
  public clear(c: Collisions) {
    this.cells.forEach((cell) => c.remove_id_from_cell(0, 0, this.id, cell));
    this.cells.clear();
  }
  public update(c: Collisions) {
    this.clear(c);
    this.build(c);
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

function arc_to_circle_collision(
  arc: Arc,
  circle: Circle
): CollisionResponse | null {
  // --- Coordinate Space Transformation ---
  const scaleY = 1 / circle.squeezeY;

  // 1. Vector from arc center to circle center, in TRANSFORMED space
  const dx = circle.x - arc.x;
  const dy_t = (circle.y - arc.y) * scaleY; // Transform the Y-delta

  // 2. Find angle and distance of the circle's center in TRANSFORMED space.
  const distanceSq_t = dx * dx + dy_t * dy_t;
  const angleToCircle_t = Math.atan2(dy_t, dx);

  // 3. Find angle relative to the arc's direction. The arc's angles are in world space.
  //    To compare, we must find the arc's direction IN THE TRANSFORMED SPACE.
  //    This is complex. A simpler, robust approximation is to assume the arc's
  //    angular sweep is unchanged, which works well unless the arc is very wide
  //    and the squeeze is very extreme. We will use this approximation.
  let relativeAngle = normalizeAngle(angleToCircle_t - arc.direction);

  // 4. Clamp the angle to the arc's sweep.
  const halfSweep = arc.sweepAngle / 2;
  const clampedAngle = Math.max(-halfSweep, Math.min(relativeAngle, halfSweep));

  // 5. Convert the clamped angle back to a world-space direction.
  const finalAngle = clampedAngle + arc.direction;

  // 6. Clamp the distance to the arc's radii in TRANSFORMED space.
  const distance_t = Math.sqrt(distanceSq_t);
  // The arc's radii don't change, as the arc itself is not squeezed.
  const clampedDist = Math.max(
    arc.innerRadius,
    Math.min(distance_t, arc.outerRadius)
  );

  // 7. We now have the closest point on the arc to the circle's center (in a hybrid space).
  //    We calculate its position in world space for clarity.
  const closestArcPointX = arc.x + Math.cos(finalAngle) * clampedDist;
  const closestArcPointY =
    arc.y + Math.sin(finalAngle) * (clampedDist / scaleY); // transform back

  // --- The Collision Check ---

  // 8. Find the vector from this closest point to the circle's center in WORLD space.
  const vecToCircleX = circle.x - closestArcPointX;
  const vecToCircleY = circle.y - closestArcPointY;

  // We must check distance against the ellipse's shape.
  // Is the vector smaller than the ellipse's radius in that direction?
  const vecToCircleMag = Math.sqrt(
    vecToCircleX * vecToCircleX + vecToCircleY * vecToCircleY
  );
  const vecToCircleAngle = Math.atan2(vecToCircleY, vecToCircleX);

  // Find the ellipse's radius at the angle of the push vector.
  const sin = Math.sin(vecToCircleAngle);
  const cos = Math.cos(vecToCircleAngle);
  const radiusAtAngle = Math.sqrt(
    1 / ((cos / circle.radiusX) ** 2 + (sin / circle.radiusY) ** 2)
  );

  if (vecToCircleMag >= radiusAtAngle) {
    return null;
  }

  // --- The Resolution ---
  const overlap = radiusAtAngle - vecToCircleMag;

  if (vecToCircleMag === 0) {
    // If centers are on top of each other
    const pushX = Math.cos(arc.direction) * overlap;
    const pushY = Math.sin(arc.direction) * overlap;
    return {
      a: arc,
      b: circle,
      vector_a: [-pushX / 2, -pushY / 2],
      vector_b: [pushX / 2, pushY / 2],
    };
  }

  const pushX = (vecToCircleX / vecToCircleMag) * overlap;
  const pushY = (vecToCircleY / vecToCircleMag) * overlap;

  return {
    a: arc,
    b: circle,
    vector_a: [-pushX / 2, -pushY / 2],
    vector_b: [pushX / 2, pushY / 2],
  };
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
    vector_a: [pushX / 2, pushY / 2],
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
