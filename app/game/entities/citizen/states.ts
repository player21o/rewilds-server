import type { Citizen } from ".";
import constants from "../../../common/constants";
import { Slash } from "../../objects/slash";
import { lookAt } from "../../utils";
import { States } from "../state";

function handle_movement(entity: Citizen, dt: number, speed: number) {
  //w, a, s, d
  const final_vector = [0, 0];

  [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]
    .map((vec, i) => ((entity.keys >> i) % 2 != 0 ? [0, 0] : vec))
    .forEach((vec) => {
      final_vector[0] += vec[0];
      final_vector[1] += vec[1];
    });

  const vec_len = (final_vector[0] ** 2 + final_vector[1] ** 2) ** 0.5;

  if (vec_len == 0) {
    final_vector[0] = 0;
    final_vector[1];
  } else {
    final_vector[0] = final_vector[0] / vec_len;
    final_vector[1] = final_vector[1] / vec_len;
  }

  entity.moving = final_vector[0] != 0 || final_vector[1] != 0;

  entity.x += speed * final_vector[0] * dt;
  entity.y += speed * final_vector[1] * dt;
}

function handle_pointer(entity: Citizen) {
  entity.direction = lookAt(
    entity.x,
    entity.y,
    entity.x + entity.pointerX,
    entity.y + entity.pointerY
  );
}

export default {
  idle: {
    flow: ["attack"],
    step(dt, entity, _manager) {
      if (entity.stamina <= 0) entity.growling = false;
      handle_movement(
        entity,
        dt,
        entity.growling ? entity.data.speed * 1.333 : entity.data.speed
      );
      handle_pointer(entity);

      if (entity.growling && entity.moving) {
        entity.stamina -= entity.data.staminaUsage * dt;
      } else if (entity.stamina < 1) {
        entity.stamina += 0.1 * dt;
      }
    },
  },
  /*
  growl: {
    flow: ["idle"],
    step(dt, entity, _manager) {
      if (entity.stamina <= 0) entity.state_manager.set("idle");
      handle_movement(entity, dt, 150 * 1.333);
      handle_pointer(entity);
      entity.stamina -= 0.3 * dt;
    },
    
  },
  */
  attack: {
    flow: ["idle"],
    enter(entity, _manager, entities) {
      const weapon = constants.weapons[entity.weapon];

      entities.add(
        new Slash(
          entity,
          weapon.meleeRange,
          weapon.meleeArc,
          weapon.attackDuration
        )
      );
    },
    step(dt, entity, manager) {
      handle_movement(
        entity,
        dt,
        entity.growling ? entity.data.speed * 1.333 : entity.data.speed
      );
      handle_pointer(entity);

      if (manager.duration >= constants.weapons[entity.weapon].attackDuration)
        entity.state_manager.set("idle");
    },
  },
} as States<Citizen>;
