import { CitizenType } from "../../common/interfaces";
import { Entity } from "./entity";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public sid: number;
  public x: number;
  public y: number;

  public constructor(name: string, sid: number, x: number, y: number) {
    super(sid, "Citizen");

    this.name = name;
    this.sid = sid;
    this.x = x;
    this.y = y;
  }
}
