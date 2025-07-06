import { Entity } from "./entity";
import { constructors_object } from "../../common/constructors";
import { build_collision_response, Collisions } from "./collisions";

export class EntitiesManager {
  private sid_map: { [sid: number]: Entity } = {};
  private entities: Entity[] = [];
  private sid_counter = 0;
  private collision_system = new Collisions(10000, 10000);

  private on_entity_created_callbacks: ((entity: Entity) => void)[] = [];

  public on_entity_created(cb: (entity: Entity) => void) {
    this.on_entity_created_callbacks.push(cb);
  }

  public add(e: Entity<any>) {
    e.sid = this.sid_counter;
    this.sid_counter += 1;
    this.sid_map[e.sid] = e;
    this.entities.push(e);
    this.on_entity_created_callbacks.forEach((cb) => cb(e));
    if (e.collision != null) {
      e.collision.id = e.sid;
      this.collision_system.insert(e.collision);
    }
  }

  public update(dt: number) {
    const before_props: [entity: Entity, props: any[]][] = [];

    this.entities.forEach((entity) =>
      before_props.push([entity, entity.update(dt, this.collision_system)])
    );

    this.collision_system.check().forEach((cols) => {
      const resp = build_collision_response(
        this.sid_map[cols[0]].collision!,
        this.sid_map[cols[1]].collision!
      );
      if (resp != null)
        this.sid_map[cols[0]].on_collision(
          resp,
          this.collision_system,
          this.sid_map[cols[0]],
          this.sid_map[cols[1]]
        );
    });

    const updates: [sid: number, props: any[], bits: number][] = [];

    before_props.forEach(([entity, props]) => {
      if (entity.new_one) {
        let bits = 0b0;

        for (let i = 0; i < props.length - 1; i++) {
          bits |= 1 << i;
        }

        updates.push([entity.sid, props, bits]);
        entity.new_one = false;
      } else {
        const changed_props: any[] = [];
        let changed_bits = 0b0;
        const constructor = constructors_object[entity.constructor_name];
        entity.constructor_properties.forEach((prop, i) => {
          const propName = prop as keyof typeof constructor;
          const converterPair = constructor[propName] as readonly [
            (val: any) => any,
            (val: any) => any
          ];

          const formatted = converterPair[0]((entity as any)[prop]);

          if (props[i] !== formatted) {
            //changed!
            changed_props.push(formatted);
            changed_bits |= 1 << i;
          }
        });

        if (changed_bits != 0b0)
          updates.push([entity.sid, changed_props, changed_bits]);
      }
    });

    return updates;
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
