import { EntitiesManager } from "..";
import constants from "../../../common/constants";
import {
  constructors_inner_keys,
  constructors_object,
} from "../../../common/constructors";
import { CitizenType } from "../../../common/interfaces";
import { Citizen } from "../citizen";
import states from "./states";

export class Player extends Citizen {
  public charging = false;
  public charge = 0;
  public private_data_changes = { bits: 0b0, data: [] as any[] };
  public stamina = 1;
  public pointerX = 0;
  public pointerY = 0;
  public growling_timer = 0;

  public constructor(
    type: CitizenType["type"],
    kind: CitizenType["kind"],
    name: string,
    x: number,
    y: number,
    e: EntitiesManager
  ) {
    super(type, kind, name, x, y, e, states);
  }

  public pre_step(_dt: number) {
    const r: { prev_props: any } = { prev_props: null };

    r.prev_props = constructors_inner_keys["CitizenPrivateData"].map((prop) => {
      const propName =
        prop as keyof (typeof constructors_object)["CitizenPrivateData"];
      const converterPair = constructors_object["CitizenPrivateData"][
        propName
      ] as readonly [(val: any) => any, (val: any) => any];

      return converterPair[0]((this as any)[prop]);
    });

    return r;
  }

  public step(
    dt: number,
    _a: undefined,
    _b: undefined,
    { prev_props }: { prev_props: any }
  ) {
    this.inputs.look[0] = this.x + this.pointerX;
    this.inputs.look[1] = this.y + this.pointerY;

    let prev_bits = this.private_data_changes.bits;
    let changed_bits = 0b0;

    if (this.health <= 0 && !this.died) this.die();

    if (!this.new_one) {
      this.step_states(dt);

      const changed_props: any[] = [];
      constructors_inner_keys["CitizenPrivateData"].forEach((prop, i) => {
        const propName =
          prop as keyof (typeof constructors_object)["CitizenPrivateData"];
        const converterPair = constructors_object["CitizenPrivateData"][
          propName
        ] as readonly [(val: any) => any, (val: any) => any];

        const formatted = converterPair[0]((this as any)[prop]);

        if ((prev_bits >> i) % 2 != 0 || prev_props[i] !== formatted) {
          //changed!
          changed_props.push(formatted);
          changed_bits |= 1 << i;
        }
      });

      this.private_data_changes.bits = changed_bits;
      this.private_data_changes.data = changed_props;
    } else {
      const changed_props: any[] = [];
      constructors_inner_keys["CitizenPrivateData"].forEach((prop, i) => {
        prop as keyof (typeof constructors_object)["CitizenPrivateData"];
        const converterPair = constructors_object["CitizenPrivateData"][
          prop
        ] as readonly [(val: any) => any, (val: any) => any];

        const formatted = converterPair[0]((this as any)[prop]);
        changed_props.push(formatted);
        changed_bits |= 1 << i;
      });

      this.private_data_changes.bits = changed_bits;
      this.private_data_changes.data = changed_props;
    }
  }

  public step_states(dt: number) {
    this.state_manager.step(dt);
    this.state = this.state_manager.state;

    if (this.charging) {
      const weapon = constants.weapons[this.weapon];
      this.charge += dt / weapon.chargeTime;
    }

    if (this.growling) {
      this.growling_timer += dt;
    }
  }
}
