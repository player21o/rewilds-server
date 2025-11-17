import { EntitiesManager } from "..";
import { CitizenType } from "../../../common/interfaces";
import { BotSight } from "../../objects/botsight";
import { Citizen } from "../citizen";
import { States } from "../state";

export class TestBot extends Citizen {
  private t = 0;
  public active = true;

  public step(dt: number, _a: undefined, _b: undefined, _p: any) {
    if (this.active) {
      this.t += dt;

      if (this.t < 0.25) {
        this.inputs.movement_vector = [1, 0];
      } else {
        this.inputs.movement_vector = [-1, 0];
      }

      if (this.t >= 0.45) {
        this.t = 0;
      }
    }

    if (this.health <= 0 && !this.died) this.die();
    this.step_states(dt);
  }
}

export class AttackBot extends Citizen {
  private sight: BotSight;

  public step(dt: number, _a: undefined, _b: undefined, _p: any) {
    if (this.health <= 0 && !this.died) this.die();
    this.step_states(dt);
  }

  public constructor(
    type: CitizenType["type"],
    kind: CitizenType["kind"],
    name: string,
    x: number,
    y: number,
    e: EntitiesManager,
    st?: States<any>
  ) {
    super(type, kind, name, x, y, e, st);

    const sight = new BotSight(this);
    this.sight = sight;

    e.add(sight);
  }
}
