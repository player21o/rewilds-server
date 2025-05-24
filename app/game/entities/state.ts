import { Entity } from "./entity";

export class StateManager<T = any> {
  public state!: T;
  public duration = 0;

  private states: States;
  private entity: Entity;

  constructor(states: States<any>, entity: Entity<any>, first_state: T) {
    this.states = states;
    this.set(first_state);
    this.entity = entity;
  }

  public set(state: T) {
    if (state == this.state) return;

    let s = this.states[this.state as keyof typeof this.states];
    console.log("first s", s);

    if (this.state != null)
      if (s.leave != undefined) s.leave(this.entity, this);

    this.state = state;
    this.duration = 0;

    s = this.states[this.state as keyof typeof this.states];
    console.log("second s", s, state);

    if (s.enter != undefined) s.enter(this.entity, this);
  }

  public step(dt: number) {
    const state = this.states[this.state as keyof typeof this.states];
    if (state.step != undefined) state.step(dt, this.entity, this);
  }
}

export type States<T extends Entity<any> = Entity<"Entity">> = {
  [name: string]: {
    enter?: (entity: T, manager: StateManager) => void;
    leave?: (entity: T, manager: StateManager) => void;
    step?: (dt: number, entity: T, manager: StateManager) => void;
  };
};
