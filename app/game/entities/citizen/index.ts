import { CitizenType } from "../../../common/interfaces";
import { Entity } from "../entity";
import { StateManager } from "../state";
import states from "./states";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public x: number;
  public y: number;
  public direction = 0;
  public health = 10;
  public team: CitizenType["team"] = 2;
  public state: CitizenType["state"] = "idle";

  public keys = 0;
  public pointerX = 0;
  public pointerY = 0;
  public state_manager = new StateManager<CitizenType["state"]>(
    states,
    this,
    this.state
  );

  public constructor(name: string, x: number, y: number) {
    super("Citizen");

    this.name = name;
    this.x = x;
    this.y = y;
  }

  public step(dt: number) {
    this.state_manager.step(dt);
    this.state = this.state_manager.state;
  }
}
