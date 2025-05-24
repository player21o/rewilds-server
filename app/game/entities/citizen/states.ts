import type { Citizen } from ".";
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
    step(dt, entity, _manager) {
      handle_movement(entity, dt, 150);
      handle_pointer(entity);
    },
  },
  growl: {
    step(dt, entity, _manager) {
      handle_movement(entity, dt, 180);
      handle_pointer(entity);
      entity.stamina -= 0.1 * dt;
    },
  },
} as States<Citizen>;
