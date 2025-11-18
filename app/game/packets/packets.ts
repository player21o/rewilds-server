import { WebSocket } from "uWebSockets.js";
import {
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "../../common/constructors";
import { Player } from "../entities/player";

export type Ws = WebSocket<unknown> & { id?: number };
export type Peer = {
  send: <T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) => void;
  id: number;
  ws: Ws;
  citizen: Player | null;
  helloed: boolean;
  welcomed: boolean;
};

type Packets = {
  [Packet in keyof ConstructorsInnerTypes]: (
    arg0: Peer,
    ...args: ConstructorsInnerTypes[Packet]
  ) => {};
};

export default {
  pointer({ citizen }, pX, pY) {
    if (citizen == null) return;

    citizen.pointerX = pX;
    citizen.pointerY = pY;
  },
  hello(peer) {
    peer.helloed = true;
  },
  keys({ citizen }, keys) {
    if (citizen == null) return;

    const final_vector: [number, number] = [0, 0];

    [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]
      .map((vec, i) => ((keys >> i) % 2 != 0 ? [0, 0] : vec))
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

    citizen.inputs.movement_vector = final_vector;
  },
  action({ citizen }, action) {
    if (citizen == null) return;

    switch (action) {
      case "growl_start":
        citizen.growling_timer = 0; //we dont use .set function because `growling_timer` is not synced with players
        citizen.set("growling", true); //we use this function because we need to change a value of entity outside the game loop
        break;
      case "growl_stop":
        citizen.set("growling", false);

        if (citizen.growling_timer <= 0.2) citizen.state_manager.set("kick");
        break;
      case "left_button_start":
        citizen.set("charging", true);
        break;
      case "left_button_finish":
        citizen.set("charging", false);
        if (citizen.charging) citizen.state_manager.set("attack");
        citizen.charge = 0;
        break;
      case "block":
        citizen.state_manager.set("block");
        break;
      case "roll":
        citizen.state_manager.set("roll");
        break;
    }
  },
} as Packets;
