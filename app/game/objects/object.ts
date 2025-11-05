import {
  CollisionObject,
  CollisionResponse,
  Collisions,
} from "../entities/collisions";
import { GameNetworking } from "../networking";

/**
 * a gameobject is like an... object??? i mean... it's just a game object
 * the difference between an entity and a gameobject is that the entity is synced across the network, while the gameobject is just a local thing
 * but entity inherits from gameobject. wow.
 */
export class GameObject {
  public x: number = 0;
  public y: number = 0;
  public collision: CollisionObject | null = null;
  public move_out_collision = true;
  public rip = false;

  //@ts-ignore
  public step(
    dt: number,
    network?: GameNetworking,
    c?: Collisions,
    extra?: any
  ) {}

  public on_collision(
    //@ts-ignore
    other: GameObject,
    //@ts-ignore
    response: CollisionResponse,
    //@ts-ignore
    network?: GameNetworking
  ): void {
    if (this.collision == null) return;
  }

  public update_collision_pos(c: Collisions) {
    if (this.collision == null) return;

    this.collision.x = this.x;
    this.collision.y = this.y;

    this.collision.update(c);
  }

  public destroy() {
    this.rip = true;
  }
}
