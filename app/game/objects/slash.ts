import {
  Arc,
  CollisionObject,
  CollisionResponse,
  Collisions,
} from "../entities/collisions";
import type { Citizen } from "../entities/citizen";
import { GameObject } from "./object";

export class Slash extends GameObject {
  private entity: Citizen;
  public collision: CollisionObject | null;
  private duration: number;
  private timer = 0;

  constructor(e: Citizen, range: number, arc: number, duration: number) {
    super();
    this.entity = e;

    this.x = e.x;
    this.y = e.y;
    this.duration = duration;

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

  public on_collision(
    _response: CollisionResponse,
    _c: Collisions,
    entity_a: GameObject,
    entity_b: GameObject
  ): void {
    console.log(this.entity.sid, (entity_b as Citizen).sid);
  }
}
