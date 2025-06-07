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
  hello(_) {
    //console.log("received hello packet from peer " + _.id);
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
        citizen.state_manager.set("growl");
        break;
      case "growl_stop":
        citizen.state_manager.set("idle");
        break;
      case "attack":
        citizen.state_manager.set("attack");
        break;
    }
  },
} as Packets;
