import {
  constructors,
  Constructors,
  ObjectKeysToTuple,
} from "../../common/constructors";

export class Entity<K extends keyof Constructors = "Entity"> {
  public sid: number;

  protected constructor_name: K;
  private constructor_properties: ObjectKeysToTuple<Constructors[K]>;

  public constructor(sid: number, constructorName: K) {
    this.sid = sid;

    this.constructor_name = constructorName;

    this.constructor_properties = Object.keys(
      constructors[constructorName]
    ) as ObjectKeysToTuple<Constructors[K]>;
  }

  public update(dt: number): [any[], number] {
    let changed_bits = 0b0;
    const prev_props = this.constructor_properties.map(
      (property) =>
        //@ts-ignore
        constructors[this.constructor_name][
          property as keyof (typeof constructors)[keyof typeof constructors]
          //@ts-ignore
        ][0](this[property]) //putting a ts-ignore because i just fucking can't
    );

    this.step(dt);

    const changed_props: any[] = [];
    this.constructor_properties.forEach((property, i) => {
      //@ts-ignore
      const network_format = constructors[this.constructor_name][
        property as keyof (typeof constructors)[keyof typeof constructors]
        //@ts-ignore
      ][0](this[property]);

      if (prev_props[i] !== network_format) {
        //changed!
        changed_props.push(network_format);
        changed_bits |= 1 << i;
      }
    });

    return [changed_props as any[], changed_bits as number];
  }

  //@ts-ignore
  public step(dt: number) {}
}
