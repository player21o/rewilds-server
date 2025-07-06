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

  /*
  return {
    resolution1: { x: -pushX / 2, y: -pushY / 2 },
    resolution2: { x: pushX / 2, y: pushY / 2 },
  };
  */

  return {
    a: c1,
    b: c2,
    vector_a: [-pushX / 2, -pushY / 2],
    vector_b: [pushX / 2, pushY / 2],
  };
}

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

  constructor(id: number, x: number, y: number, radius: number) {
    super(id, x, y);

    this.radius = radius;
  }

  public build(c: Collisions): void {
    const left_up_corner_world = [this.x - this.radius, this.y - this.radius];
    const right_down_corner_world = [
      this.x + this.radius,
      this.y + this.radius,
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
        this.set_cell(c, x, y);
      }
    }
  }
}
