export class Collisions {
  public cell_size = 16;
  public cells: Set<number>[][] = [];
  private non_empty_cells: Set<Set<number>> = new Set();
  private objects: { [id: number]: CollisionObject } = {};

  constructor(width: number, height: number) {
    for (let x = 0; x < Math.ceil(width / this.cell_size) + 1; x++) {
      this.cells.push([]);

      for (let y = 0; y < Math.ceil(height / this.cell_size) + 1; y++) {
        this.cells[x].push(new Set());
      }
    }
  }

  public set_cell(x: number, y: number, id: number) {
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

class CollisionObject {
  public id: number;
  private cells: Set<Set<number>> = new Set();

  constructor(id: number) {
    this.id = id;
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
    this.update(c);
  }
}

export class Box extends CollisionObject {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(id: number, x: number, y: number, width: number, height: number) {
    super(id);

    this.x = x;
    this.y = y;
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
        this.set_cell(c, x, y);
      }
    }
  }
}
