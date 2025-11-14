import type { Player } from ".";
import constants from "../../../common/constants";
import { States } from "../state";
import { default as citizen_states, handle_pointer } from "../citizen/states";
import { handle_movement as handle_citizen_movement } from "../citizen/states";

function handle_movement(entity: Player, dt: number, allow_growling = true) {
  handle_citizen_movement(entity, dt, allow_growling, () => {
    if (entity.stamina <= 0) entity.growling = false;
    if (allow_growling && entity.growling && entity.moving) {
      entity.stamina -= entity.data.staminaUsage * dt;
    } else if (entity.stamina < 1) {
      entity.stamina += 0.1 * dt;
    }
  });
}

export default {
  ...citizen_states,
  idle: {
    ...citizen_states.idle,
    step(dt, entity, manager) {
      handle_movement(entity, dt);

      handle_pointer(entity);

      const weapon = constants.weapons[entity.weapon];

      if (entity.charging) entity.stamina -= weapon.chargeStaminaUsage * dt;
      if (entity.stamina <= 0 && entity.charging) entity.charging = false;
      if (entity.charge >= 1 && entity.stamina > 0) {
        entity.charging = false;
        entity.charge = 0;
        manager.set(weapon.onCharged);
      }
    },
  },
} as States<Player, Player["state"]>;

/*
export default {
  idle: {
    ...citizen_states.idle,
    step(dt, entity, manager) {
      handle_movement(entity, dt);

      handle_pointer(entity);

      const weapon = constants.weapons[entity.weapon];

      if (entity.charging) entity.stamina -= weapon.chargeStaminaUsage * dt;
      if (entity.stamina <= 0 && entity.charging) entity.charging = false;
      if (entity.charge >= 1 && entity.stamina > 0)
        manager.set(weapon.onCharged);
    },
  },
  roll: {
    flow: ["idle"],
    step(dt, entity, manager) {
      const duration = 0.8;
      if (manager.duration >= duration) manager.set("idle");
      const direction = [
        Math.cos(entity.direction),
        Math.sin(entity.direction),
      ];
      entity.x += direction[0] * 150 * dt;
      entity.y += direction[1] * 150 * dt;
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
      entity.charging = false;
      entity.charge = 0;

      const weapon = constants.weapons[entity.weapon];

      entities.add(
        new Slash(
          entity,
          weapon.meleeRange,
          Math.PI * 2,
          0.6,
          weapon.meleeDamage
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
} as States<Player, Player["state"]>;
*/
