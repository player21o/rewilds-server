export class Entity {
  public sid: number;

  public constructor(sid: number) {
    this.sid = sid;
  }

  public step(dt: number) {}
}
