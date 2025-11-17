import { EntitiesManager } from "..";
import { CitizenType } from "../../../common/interfaces";
import { BotSight } from "../../objects/botsight";
import { distance, lookAt } from "../../utils";
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
  private target: Citizen | null = null;
  private mode: "attack" | "idle" = "idle";

  public step(dt: number, _a: undefined, _b: undefined, _p: any) {
    if (this.target != null && this.target.state == "dead") this.target = null;

    if (this.target == null && this.sight.entities.size > 0) {
      this.target = [...this.sight.entities.keys()][0];
    }

    if (this.target != null) {
      this.inputs.look = [this.target.x, this.target.y];

      if (distance(this.x, this.y, this.target.x, this.target.y) >= 100) {
        const angle = lookAt(this.x, this.y, this.target.x, this.target.y);

        this.inputs.movement_vector = [Math.cos(angle), Math.sin(angle)];
      } else {
        if (this.target.state == "attack") {
          this.state_manager.set("block");
          this.inputs.movement_vector = [0, 0];
        } else if (this.target.state == "roll") {
          this.state_manager.set("block");
          this.inputs.movement_vector = [0, 0];
        } else if (this.target.state == "spin") {
          const angle = lookAt(this.target.x, this.target.y, this.x, this.y);
          this.inputs.movement_vector = [Math.cos(angle), Math.sin(angle)];
        } else if (this.target.state == "stunned") {
          this.state_manager.set("attack");
        } else {
          this.inputs.movement_vector = [0, 0];
        }
      }
    }

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

    const sight = new BotSight(this, 400);
    this.sight = sight;

    e.add(sight);
  }
}
