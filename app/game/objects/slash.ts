import {
  Arc,
  CollisionObject,
  CollisionResponse,
  Collisions,
} from "../entities/collisions";
import { Citizen } from "../entities/citizen";
import { GameObject } from "./object";

export class Slash extends GameObject {
  private entity: Citizen;
  public collision: CollisionObject | null;
  private duration: number;
  private timer = 0;
  private hits: number[] = [];
  public move_out_collision = false;
  private damage: number;

  constructor(
    e: Citizen,
    range: number,
    arc: number,
    duration: number,
    damage: number
  ) {
    super();
    this.entity = e;

    this.x = e.x;
    this.y = e.y;
    this.duration = duration;
    this.damage = damage;

    this.collision = new Arc(
      0,
      this.x,
      this.y,
      e.collision.radius,
      range,
      e.direction,
      arc
    );
  }

  public step(dt: number, c?: Collisions): void {
    this.x = this.entity.x;
    this.y = this.entity.y;

    this.timer += dt;
    if (this.timer >= this.duration) this.destroy();

    if (c != undefined) this.update_collision_pos(c);
  }

  public on_collision(other: GameObject, _resp: CollisionResponse): void {
    if (
      other instanceof Citizen &&
      other.sid != this.entity.sid &&
      !(other.sid in this.hits)
    ) {
      this.hits.push(other.sid);

      other.set("health", other.health - this.damage);
    }
  }
}
