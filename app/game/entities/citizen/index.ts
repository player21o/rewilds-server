import { Circle } from "detect-collisions";
import {
  constructors_inner_keys,
  constructors_object,
} from "../../../common/constructors";
import { CitizenType } from "../../../common/interfaces";
import { Collision, Entity } from "../entity";
import { StateManager } from "../state";
import states from "./states";
import constants from "../../../common/constants";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public x: number;
  public y: number;
  public direction = 0;
  public health;
  public maxHealth;
  public weapon: CitizenType["weapon"];
  public shield: CitizenType["shield"];
  public team: CitizenType["team"] = 0;
  public state: CitizenType["state"] = "idle";
  public gender: CitizenType["gender"] = "female";
  public type: CitizenType["type"];
  public growling = false;
  public maxArmor: number;

  public data;

  public keys = 0;
  public pointerX = 0;
  public pointerY = 0;
  public state_manager = new StateManager<CitizenType["state"]>(
    states,
    this,
    this.state
  );
  public stamina = 1;

  public private_data_changes = { bits: 0b0, data: [] as any[] };

  public moving = false;

  public collision = new Circle({ x: 0, y: 0 }, 14, {
    userData: { entity: this },
  }) as Collision<typeof this>;

  public constructor(
    type: CitizenType["type"],
    name: string,
    x: number,
    y: number
  ) {
    super("Citizen");

    this.type = type;

    const data = {
      ...constants.minions["default"],
      ...constants.minions[type],
    };

    this.weapon = data.weapon;
    this.shield = data.shield;
    this.maxHealth = data.maxHealth;
    this.maxArmor = data.maxArmor;
    this.health = this.maxHealth;

    this.name = name;
    this.x = x;
    this.y = y;
    this.data = data;
  }

  public step(dt: number) {
    let prev_bits = this.private_data_changes.bits;
    let changed_bits = 0b0;

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

  protected on_collision(response: SAT.Response): void {
    if (this.collision == null) return;

    const entity_a = (response.a as Collision<any>).userData
      .entity as Entity<any>;
    const entity_b = (response.b as Collision<any>).userData
      .entity as Entity<any>;

    if (entity_a instanceof Citizen && entity_b instanceof Citizen) {
      entity_a.x += response.overlapN.x / 2;
      entity_a.y += response.overlapN.y / 2;
      entity_b.x += response.overlapV.x / 2;
      entity_b.y += response.overlapV.y / 2;

      entity_a.update_collision_pos();
      entity_b.update_collision_pos();
    }
  }

  public step_states(dt: number) {
    this.state_manager.step(dt);
    this.state = this.state_manager.state;
  }
}
