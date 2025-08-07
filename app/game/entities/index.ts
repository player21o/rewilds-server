import { Entity } from "./entity";
import { constructors_object } from "../../common/constructors";
import { build_collision_response, Collisions } from "./collisions";
import { GameObject } from "../objects/object";

export class EntitiesManager {
  private sid_map: { [sid: number]: Entity } = {};
  private entities: Entity[] = [];
  public objects: GameObject[] = [];
  private sid_counter = 0;
  private collision_system = new Collisions(10000, 10000);
  private collision_counter = 0;
  private collision_map: { [id: number]: Entity | GameObject } = {};

  private on_entity_created_callbacks: ((entity: Entity) => void)[] = [];

  public on_entity_created(cb: (entity: Entity) => void) {
    this.on_entity_created_callbacks.push(cb);
  }

  public add(e: Entity<any> | GameObject) {
    if (e instanceof Entity) {
      e.sid = this.sid_counter;
      this.sid_counter += 1;
      this.sid_map[e.sid] = e;
      this.entities.push(e);
      this.on_entity_created_callbacks.forEach((cb) => cb(e));
    } else {
      this.objects.push(e);
    }

    if (e.collision != null) {
      e.collision.id = this.collision_counter;
      this.collision_counter += 1;
      this.collision_map[e.collision.id] = e;
      this.collision_system.insert(e.collision);
    }
  }

  public update(dt: number) {
    const before_props: [entity: Entity, props: any[]][] = [];
    const to_remove: (Entity | GameObject)[] = [];

    this.entities.forEach((entity) => {
      before_props.push([entity, entity.update(dt, this.collision_system)]);
      if (entity.rip) to_remove.push(entity);
    });

    this.objects.forEach((obj) => {
      obj.step(dt, this.collision_system);
      if (obj.rip) to_remove.push(obj);
    });

    this.collision_system.check().forEach((cols) => {
      const resp = build_collision_response(
        this.collision_map[cols[0]].collision!,
        this.collision_map[cols[1]].collision!
      );
      if (resp != null) {
        const entity_a = this.collision_map[cols[0]];
        const entity_b = this.collision_map[cols[1]];

        entity_a.on_collision(entity_b, resp);
        entity_b.on_collision(entity_a, resp);

        if (entity_a.move_out_collision && entity_b.move_out_collision) {
          entity_a.x += resp.vector_a[0];
          entity_a.y += resp.vector_a[1];
          entity_b.x += resp.vector_b[0];
          entity_b.y += resp.vector_b[1];
        }

        entity_a.update_collision_pos(this.collision_system);
        entity_b.update_collision_pos(this.collision_system);
      }
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

    to_remove.forEach((e) => this.remove(e));

    return updates;
  }

  public get_entity(sid: number) {
    return this.sid_map[sid];
  }

  public get_entity_by_index(i: number) {
    return this.entities[i];
  }

  public remove(e: number | Entity | GameObject) {
    const entity: Entity | GameObject =
      !(e instanceof Entity) && !(e instanceof GameObject)
        ? this.sid_map[e as number]
        : e;

    if (entity instanceof Entity)
      this.entities.splice(this.entities.indexOf(entity), 1);
    else this.objects.splice(this.objects.indexOf(entity), 1);

    if (entity instanceof Entity) {
      this.entities.splice(this.entities.indexOf(entity), 1);
      delete this.sid_map[entity.sid];
    } else {
      this.objects.splice(this.objects.indexOf(entity), 1);
    }

    if (entity.collision != null) {
      this.collision_system.remove(entity.collision);
      delete this.collision_map[entity.collision.id];
    }
  }

  public forEachEntity(callback: (arg0: Entity) => void) {
    this.entities.forEach(callback);
  }

  get snapshot() {
    return this.entities.map((e) => e.snapshot());
  }

  public stop() {
    this.on_entity_created_callbacks = [];
  }
}
