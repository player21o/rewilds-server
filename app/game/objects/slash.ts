import {
  Arc,
  CollisionObject,
  CollisionResponse,
  Collisions,
} from "../entities/collisions";
import { Citizen } from "../entities/citizen";
import { GameObject } from "./object";
import { lookAt } from "../utils";

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
      this.entity.team != other.team &&
      other.sid != this.entity.sid &&
      other.state != "dead" &&
      other.state != "dying" &&
      !this.hits.includes(other.sid)
    ) {
      this.hits.push(other.sid);

      other.set("health", (hp) => {
        const new_hp = hp - this.damage;

        if (new_hp <= 0) {
          //if the hit is fatal
          other.direction = lookAt(
            other.x,
            other.y,
            this.entity.x,
            this.entity.y
          );
        }

        return new_hp;
      });
    }
  }
}
