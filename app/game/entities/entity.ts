import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerKeys,
  ConstructorsObject,
} from "../../common/constructors";

import { Circle, Polygon, Response, System } from "detect-collisions";

export type Collision<T extends Entity<any>> = (Polygon | Circle) & {
  userData: { entity: T };
};

export class Entity<K extends keyof ConstructorsObject = "Entity"> {
  public sid: number = -1;
  public x = 0;
  public y = 0;

  private to_set: { [key: string]: any } = {};

  public constructor_name: K;
  public constructor_properties: ConstructorsInnerKeys[K];

  public new_one = true;
  public collision: Collision<typeof this> | null = null;

  public constructor(constructorName: K) {
    this.constructor_name = constructorName;

    this.constructor_properties =
      constructors_inner_keys[this.constructor_name];
  }

  public snapshot(): any {
    const constructor = constructors_object[this.constructor_name];
    //console.log(constructor, this.constructor_properties);

    return [constructors_keys.indexOf(this.constructor_name)].concat(
      ...this.constructor_properties.map((prop) => {
        const propName = prop as keyof typeof constructor;
        const converterPair = constructor[propName] as readonly [
          (val: any) => any,
          (val: any) => any
        ];

        return converterPair[0]((this as any)[prop]);
      })
    ) as any;
  }

  public update(dt: number, s: System) {
    const constructor = constructors_object[this.constructor_name];

    const updates = !this.new_one
      ? this.constructor_properties.map((prop) => {
          const propName = prop as keyof typeof constructor;
          const converterPair = constructor[propName] as readonly [
            (val: any) => any,
            (val: any) => any
          ];

          return converterPair[0]((this as any)[prop]);
        })
      : this.snapshot();

    Object.keys(this.to_set).forEach((key) => {
      this[key as keyof this] = this.to_set[key];
      delete this.to_set[key];
    });

    this.step(dt);
    this.process_collisions(s);

    return updates;
  }

  protected process_collisions(system: System) {
    if (this.collision == null) return;

    this.update_collision_pos();
    system.checkOne(this.collision, this.on_collision.bind(this));
    system.separateBody(this.collision);
    this.x = this.collision.x;
    this.y = this.collision.y;
  }

  //@ts-ignore
  protected on_collision(response: Response): void {
    if (this.collision == null) return;
  }

  public update_collision_pos() {
    if (this.collision == null) return;

    this.collision.setPosition(this.x, this.y, true);
  }

  //@ts-ignore
  public step(dt: number) {}

  /**
   * a function to set some value inside entity *outside* update loop (e. g. as an answer to packet)
   */

  public set<T extends keyof typeof this>(key: T, value: (typeof this)[T]) {
    this.to_set[key as any] = value;
  }
}
