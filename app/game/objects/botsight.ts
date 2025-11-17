import { Citizen } from "../entities/citizen";
import { Circle, CollisionResponse } from "../entities/collisions";
import { GameNetworking } from "../networking";
import { GameObject } from "./object";

export class BotSight extends GameObject {
  private entity: Citizen;
  public entities = new Set<Citizen>();

  constructor(e: Citizen, radius = 100) {
    super();

    this.entity = e;
    this.collision = new Circle(0, this.x, this.y, radius);
  }

  public step(_dt: number): void {
    this.x = this.entity.x;
    this.y = this.entity.y;
  }

  public on_collision(
    other: GameObject,
    _response: CollisionResponse,
    _network?: GameNetworking
  ): void {
    if (
      other instanceof Citizen &&
      other.sid != this.entity.sid &&
      !this.entities.has(other)
    ) {
      this.entities.add(other);
    }
  }
}
