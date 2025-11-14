import { Citizen } from "../citizen";

export class TestBot extends Citizen {
  private t = 0;

  public step(dt: number, _a: undefined, _b: undefined, _p: any) {
    this.t += dt;

    if (this.t < 0.25) {
      this.inputs.movement_vector = [1, 0];
    } else {
      this.inputs.movement_vector = [-1, 0];
    }

    if (this.t >= 0.45) {
      this.t = 0;
    }

    if (this.health <= 0 && !this.died) this.die();
    this.step_states(dt);
  }
}
