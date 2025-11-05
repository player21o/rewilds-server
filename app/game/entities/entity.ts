import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerKeys,
  ConstructorsObject,
} from "../../common/constructors";
import { GameObject } from "../objects/object";
import { ToPrimitive } from "../utils";
import type { Collisions } from "./collisions";

/*
export type Collision<T extends Entity<any>> = (Polygon | Circle) & {
  userData: { entity: T };
};
*/

export class Entity<
  K extends keyof ConstructorsObject = "Entity",
> extends GameObject {
  public sid: number = -1;

  private to_set: { [key: string]: any } = {};

  public constructor_name: K;
  public constructor_properties: ConstructorsInnerKeys[K];

  public new_one = true;

  public constructor(constructorName: K) {
    super();
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
          (val: any) => any,
        ];

        return converterPair[0]((this as any)[prop]);
      })
    ) as any;
  }

  public pre_step(dt: number): any {}

  public update(dt: number, c: Collisions) {
    const constructor = constructors_object[this.constructor_name];

    const updates = !this.new_one
      ? this.constructor_properties.map((prop) => {
          const propName = prop as keyof typeof constructor;
          const converterPair = constructor[propName] as readonly [
            (val: any) => any,
            (val: any) => any,
          ];

          return converterPair[0]((this as any)[prop]);
        })
      : this.snapshot();

    const pre_step_info = this.pre_step(dt);

    Object.keys(this.to_set).forEach((key) => {
      this[key as keyof this] = this.to_set[key];
      delete this.to_set[key];
    });

    this.step(dt, undefined, undefined, pre_step_info);
    this.update_collision_pos(c);

    return updates;
  }

  /**
   * a function to set some value inside entity *outside* update loop (e. g. as an answer to packet)
   */

  public set<T extends keyof typeof this>(
    key: T,
    value:
      | ((
          prev_value: ToPrimitive<(typeof this)[T]>
        ) => ToPrimitive<(typeof this)[T]>)
      | ToPrimitive<(typeof this)[T]>
  ) {
    if (typeof value == "function") {
      this.to_set[key as any] = value(
        key in this.to_set ? this.to_set[key as any] : this[key]
      );
    } else {
      this.to_set[key as any] = value;
    }
  }
}
