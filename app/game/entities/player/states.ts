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
