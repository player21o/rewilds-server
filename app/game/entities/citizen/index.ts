import { CitizenType } from "../../../common/interfaces";
import { Entity } from "../entity";
import { StateManager, States } from "../state";
import constants from "../../../common/constants";
import { Circle, CollisionResponse } from "../collisions";
import { EntitiesManager } from "..";
import states from "./states";
import { GameNetworking } from "../../networking";
import { GameObject } from "../../objects/object";

type CitizenInputs = {
  movement_vector: [x: number, y: number];
  look: [x: number, y: number];
};

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
  public kind: CitizenType["kind"];
  public type: CitizenType["type"];
  public growling = false;
  public maxArmor: number;

  public inputs: CitizenInputs = {
    movement_vector: [0, 0],
    look: [this.y, this.x + 1],
  };

  public data;
  public state_manager;
  public died = false;
  public moving = false;
  public collision;

  public hit_sid: number[] = [];

  public constructor(
    type: CitizenType["type"],
    kind: CitizenType["kind"],
    name: string,
    x: number,
    y: number,
    e: EntitiesManager,
    st?: States<any>
  ) {
    super("Citizen");
    this.state_manager = new StateManager<CitizenType["state"]>(
      st == undefined ? states : st,
      this,
      this.state,
      e
    );

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

    this.collision = new Circle(this.sid, this.x, this.y, 12, 0.6);
    this.kind = kind;
  }

  public step(dt: number, _a: undefined, _b: undefined, _p: any) {
    if (this.health <= 0 && !this.died) this.die();
    this.step_states(dt);
  }

  public step_states(dt: number) {
    this.state_manager.step(dt);
    this.state = this.state_manager.state;
  }

  public die() {
    this.died = true;
    this.state_manager.set("dying", true);
  }

  public on_collision(
    other: GameObject,
    _response: CollisionResponse,
    _network?: GameNetworking
  ): void {
    if (
      other instanceof Citizen &&
      this.state == "roll" &&
      !this.hit_sid.includes(other.sid)
    ) {
      other.set("health", (hp) => hp - 1);
      this.hit_sid.push(other.sid);
    }
  }
}
