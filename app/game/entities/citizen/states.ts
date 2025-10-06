import type { Citizen } from ".";
import constants from "../../../common/constants";
import { Slash } from "../../objects/slash";
import { lookAt } from "../../utils";
import { States } from "../state";

function handle_movement(entity: Citizen, dt: number) {
  const speed = entity.growling ? entity.data.speed * 1.333 : entity.data.speed;
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

  if (entity.stamina <= 0) entity.growling = false;
  if (entity.growling && entity.moving) {
    entity.stamina -= entity.data.staminaUsage * dt;
  } else if (entity.stamina < 1) {
    entity.stamina += 0.1 * dt;
  }
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
    flow: ["attack", "charge", "block"],
    step(dt, entity, _manager) {
      handle_movement(entity, dt);
      handle_pointer(entity);
    },
  },
  charge: {
    flow: ["idle"],
    step(dt, entity, _manager) {
      handle_movement(entity, dt);
      handle_pointer(entity);
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

      const duration = 0.75;

      if (manager.duration >= duration) manager.set("idle");
    },
  },
  stunned: {
    flow: ["idle"],
    step(_dt, _entity, manager) {
      if (manager.duration >= 1) manager.set("idle");
    },
  },
} as States<Citizen, Citizen["state"]>;
