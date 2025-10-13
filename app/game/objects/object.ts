import {
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "../../common/constructors";
import {
  CollisionObject,
  CollisionResponse,
  Collisions,
} from "../entities/collisions";

/*
public broadcast<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    this.app.publish("global", pack(this.construct_packet(msg, ...args)), true);
  }
*/

/**
 * a class that controls broadcasting packets from objects
 */
class OutBoundPackets {
  public packets: any[] = [];

  public add<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    this.packets.push([msg, args]);
  }

  public clear() {
    this.packets = [];
  }

  get length() {
    return this.packets.length;
  }
}

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
  public outbound = new OutBoundPackets();

  //@ts-ignore
  public step(dt: number, c?: Collisions) {}

  public on_collision(
    //@ts-ignore
    other: GameObject,
    //@ts-ignore
    response: CollisionResponse
    //@ts-ignore
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
