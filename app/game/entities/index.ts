import { Entity } from "./entity";

export class EntitiesManager {
  private sid_map: { [sid: number]: Entity } = {};
  private entities: Entity[] = [];
  private sid_counter = 0;

  private on_entity_created_callbacks: ((entity: Entity) => void)[] = [];

  public on_entity_created(cb: (entity: Entity) => void) {
    this.on_entity_created_callbacks.push(cb);
  }

  public add(e: any) {
    e.sid = this.sid_counter;
    this.sid_counter += 1;
    this.sid_map[e.sid] = e;
    this.entities.push(e);
    this.on_entity_created_callbacks.forEach((cb) => cb(e));
  }

  public get(sid: number) {
    return this.sid_map[sid];
  }

  public get_by_index(i: number) {
    return this.entities[i];
  }

  public remove(e: number | Entity) {
    if (e instanceof Entity) {
      this.entities.splice(this.entities.indexOf(e), 1);
      delete this.sid_map[e.sid];
    } else {
      this.entities.splice(this.entities.indexOf(this.sid_map[e]), 1);
      delete this.sid_map[e];
    }
  }

  public forEach(callback: (arg0: Entity) => void) {
    this.entities.forEach(callback);
  }

  get snapshot() {
    return this.entities.map((e) => e.snapshot());
  }

  public stop() {
    this.on_entity_created_callbacks = [];
  }
}
