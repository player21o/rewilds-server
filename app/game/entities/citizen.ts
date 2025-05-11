import { CitizenType } from "../../common/interfaces";
import { Entity } from "./entity";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public x: number;
  public y: number;

  public constructor(name: string, x: number, y: number) {
    super("Citizen");

    this.name = name;
    this.x = x;
    this.y = y;
  }
}
