import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerKeys,
  ConstructorsObject,
} from "../../common/constructors";

import { Polygon, Response, System } from "detect-collisions";

export class Entity<K extends keyof ConstructorsObject = "Entity"> {
  public sid: number = -1;
  public x = 0;
  public y = 0;

  protected constructor_name: K;
  protected constructor_properties: ConstructorsInnerKeys[K];

  protected new_one = true;
  public collision: Polygon | null = null;

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

  public update(dt: number, collision_system: System): [any[], number] {
    let changed_bits = 0b0;
    const constructor = constructors_object[this.constructor_name];

    if (!this.new_one) {
      const prev_props = this.constructor_properties.map((prop) => {
        const propName = prop as keyof typeof constructor;
        const converterPair = constructor[propName] as readonly [
          (val: any) => any,
          (val: any) => any
        ];

        return converterPair[0]((this as any)[prop]);
      });

      this.step(dt);
      this.process_collisions(collision_system);

      const changed_props: any[] = [];
      this.constructor_properties.forEach((prop, i) => {
        const propName = prop as keyof typeof constructor;
        const converterPair = constructor[propName] as readonly [
          (val: any) => any,
          (val: any) => any
        ];

        const formatted = converterPair[0]((this as any)[prop]);

        if (prev_props[i] !== formatted) {
          //changed!
          changed_props.push(formatted);
          changed_bits |= 1 << i;
        }
      });

      return [changed_props, changed_bits];
    } else {
      const changed_props: any[] = [
        constructors_keys.indexOf(this.constructor_name),
      ];
      this.constructor_properties.forEach((prop, i) => {
        const propName = prop as keyof typeof constructor;
        const converterPair = constructor[propName] as readonly [
          (val: any) => any,
          (val: any) => any
        ];

        const formatted = converterPair[0]((this as any)[prop]);
        changed_props.push(formatted);
        changed_bits |= 1 << i;
      });

      this.new_one = false;

      return [changed_props, changed_bits];
    }
  }

  protected process_collisions(system: System) {
    if (this.collision == null) return;
    this.collision.setPosition(this.x, this.y);
    system.checkOne(this.collision, this.on_collision);
  }

  //@ts-ignore
  protected on_collision(response: Response): void {}

  //@ts-ignore
  public step(dt: number) {}
}
