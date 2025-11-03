import { WebSocket } from "uWebSockets.js";
import {
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "../../common/constructors";
import { Citizen } from "../entities/citizen";

export type Ws = WebSocket<unknown> & { id?: number };
export type Peer = {
  send: <T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) => void;
  id: number;
  ws: Ws;
  citizen: Citizen | null;
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

    //const [pointerX, pointerY] = [citizen.x + pX, citizen.y + pY];

    citizen.pointerX = pX;
    citizen.pointerY = pY;
  },
  hello(peer) {
    peer.helloed = true;
  },
  keys({ citizen }, keys) {
    if (citizen == null) return;

    citizen.keys = keys;
    //console.log(keys);
  },
  action({ citizen }, action) {
    if (citizen == null) return;

    switch (action) {
      case "growl_start":
        citizen.set("growling", true); //we use this function because we need to change a value of entity outside the game loop
        break;
      case "growl_stop":
        citizen.set("growling", false);
        break;
      case "left_button_start":
        citizen.set("charging", true);
        break;
      case "left_button_finish":
        citizen.set("charging", false);
        citizen.charge = 0;
        break;
      case "block":
        citizen.state_manager.set("block");
        break;
    }
  },
} as Packets;
