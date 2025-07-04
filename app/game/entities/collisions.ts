import type { Entity } from "./entity";

export type CollisionResponse = {
  a: Entity;
  b: Entity;
  vector_a: [number, number];
  vector_b: [number, number];
};

export class Collisions {
  public cell_size = 8;
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
    if (!(x in this.cells)) console.log(x, this.cells.length);
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
    const collisions: number[][] = [];

    this.non_empty_cells.forEach((cell) => {
      if (cell.size >= 2) {
        collisions.push(Array.from(cell));
      }
    });

    return collisions;
  }
}

export class CollisionObject {
  public id: number;
  public x: number;
  public y: number;
  private cells: Set<Set<number>> = new Set();

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  protected set_cell(c: Collisions, x: number, y: number) {
    this.cells.add(c.set_cell(x, y, this.id));
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

export function build_collision_response(
  a: Entity<any>,
  b: Entity<any>
): CollisionResponse | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const a_obj = a.collision as Box;
  const b_obj = b.collision as Box;

  const combinedHalfWidths = a_obj.width / 2 + b_obj.width / 2;
  const combinedHalfHeights = a_obj.height / 2 + b_obj.height / 2;

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

export class Box extends CollisionObject {
  public width: number;
  public height: number;

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
