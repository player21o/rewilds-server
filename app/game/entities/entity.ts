import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerKeys,
  ConstructorsObject,
} from "../../common/constructors";

export class Entity<K extends keyof ConstructorsObject = "Entity"> {
  public sid: number = -1;

  protected constructor_name: K;
  private constructor_properties: ConstructorsInnerKeys[K];

  private new_one = true;

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

  public update(dt: number): [any[], number] {
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

  //@ts-ignore
  public step(dt: number) {}
}
