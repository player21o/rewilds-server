import type { Citizen } from ".";
import constants from "../../../common/constants";
import { Slash } from "../../objects/slash";
import { lookAt } from "../../utils";
import { States } from "../state";

export function handle_movement(
  entity: Citizen,
  dt: number,
  allow_growling = true,
  custom?: (entity: any) => void
) {
  const speed =
    entity.growling && allow_growling
      ? entity.data.speed * 1.333
      : entity.data.speed;

  entity.moving =
    entity.inputs.movement_vector[0] != 0 ||
    entity.inputs.movement_vector[1] != 0;

  entity.x += speed * entity.inputs.movement_vector[0] * dt;
  entity.y += speed * entity.inputs.movement_vector[1] * dt;

  if (custom != undefined) custom(entity);
}

export function handle_pointer(entity: Citizen) {
  entity.direction = lookAt(
    entity.x,
    entity.y,
    entity.inputs.look[0],
    entity.inputs.look[1]
  );
}

export default {
  idle: {
    flow: ["attack", "charge", "block", "spin", "roll"],
    enter(entity) {
      entity.move_out_collision = true;
      entity.hit_sid = [];
    },
    step(dt, entity, _manager) {
      handle_movement(entity, dt);

      handle_pointer(entity);
    },
  },
  roll: {
    flow: ["idle"],
    enter(entity) {
      entity.move_out_collision = false;
    },
    step(dt, entity, manager) {
      const duration = 0.8;
      if (manager.duration >= duration) manager.set("idle");
      const direction = [
        Math.cos(entity.direction),
        Math.sin(entity.direction),
      ];
      entity.x += direction[0] * 200 * dt;
      entity.y += direction[1] * 200 * dt;
    },
  },
  attack: {
    flow: ["idle"],
    enter(entity, _manager, entities) {
      const weapon = constants.weapons[entity.weapon];

      entities.add(
        new Slash(
          entity,
          weapon.meleeRange,
          weapon.meleeArc,
          weapon.attackDuration,
          weapon.meleeDamage
        )
      );
    },
    step(dt, entity, manager) {
      handle_movement(entity, dt);
      handle_pointer(entity);

      if (manager.duration >= constants.weapons[entity.weapon].attackDuration)
        entity.state_manager.set("idle");
    },
  },
  dying: {
    flow: ["dead"],
    enter(entity, _manager, entities) {
      entity.collision.destroy(entities.collision_system);
    },
    step(dt, entity, manager) {
      const duration = 1.5;

      const vec = [
        100 * Math.cos(entity.direction),
        100 * Math.sin(entity.direction),
      ];
      entity.x = entity.x - (duration - manager.duration) * vec[0] * dt;
      entity.y = entity.y - (duration - manager.duration) * vec[1] * dt;

      if (manager.duration >= duration) manager.set("dead");
    },
  },
  block: {
    flow: ["idle"],
    step(dt, entity, manager) {
      handle_movement(entity, dt);
      handle_pointer(entity);

      const duration = 1;

      if (manager.duration >= duration) manager.set("idle");
    },
  },
  stunned: {
    flow: ["idle"],
    step(_dt, _entity, manager) {
      if (manager.duration >= 1) manager.set("idle");
    },
  },
  dead: {},
  spin: {
    flow: ["idle"],
    enter(entity, _manager, entities) {
      const weapon = constants.weapons[entity.weapon];

      entities.add(
        new Slash(
          entity,
          weapon.meleeRange,
          Math.PI * 2,
          0.6,
          weapon.meleeDamage,
          0
        )
      );
    },
    step(dt, entity, manager) {
      const duration = 0.6;
      if (manager.duration >= duration) manager.set("idle");
      const direction = [
        Math.cos(entity.direction),
        Math.sin(entity.direction),
      ];
      entity.x += direction[0] * 150 * (duration - manager.duration) * 2 * dt;
      entity.y += direction[1] * 150 * (duration - manager.duration) * 2 * dt;
      handle_movement(entity, dt, false);
    },
  },
} as States<Citizen, Citizen["state"]>;
