import { Circle } from "detect-collisions";
import {
  constructors_inner_keys,
  constructors_object,
} from "../../../common/constructors";
import { CitizenType } from "../../../common/interfaces";
import { Collision, Entity } from "../entity";
import { StateManager } from "../state";
import states from "./states";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public x: number;
  public y: number;
  public direction = 0;
  public health = 10;
  public team: CitizenType["team"] = 0;
  public state: CitizenType["state"] = "idle";
  public gender: CitizenType["gender"] = "female";

  public keys = 0;
  public pointerX = 0;
  public pointerY = 0;
  public state_manager = new StateManager<CitizenType["state"]>(
    states,
    this,
    this.state
  );
  public stamina = 10;

  public private_data_changes = { bits: 0b0, data: [] as any[] };

  public collision = new Circle({ x: 0, y: 0 }, 15, {
    userData: { entity: this },
  }) as Collision<typeof this>;

  public constructor(name: string, x: number, y: number) {
    super("Citizen");

    this.name = name;
    this.x = x;
    this.y = y;
  }

  public step(dt: number) {
    let changed_bits = this.private_data_changes.bits;

    if (!this.new_one) {
      const prev_props = constructors_inner_keys["CitizenPrivateData"].map(
        (prop) => {
          const propName =
            prop as keyof (typeof constructors_object)["CitizenPrivateData"];
          const converterPair = constructors_object["CitizenPrivateData"][
            propName
          ] as readonly [(val: any) => any, (val: any) => any];

          return converterPair[0]((this as any)[prop]);
        }
      );

      this.step_states(dt);

      const changed_props: any[] = [];
      constructors_inner_keys["CitizenPrivateData"].forEach((prop, i) => {
        const propName =
          prop as keyof (typeof constructors_object)["CitizenPrivateData"];
        const converterPair = constructors_object["CitizenPrivateData"][
          propName
        ] as readonly [(val: any) => any, (val: any) => any];

        const formatted = converterPair[0]((this as any)[prop]);

        if (prev_props[i] !== formatted) {
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
  }
}
