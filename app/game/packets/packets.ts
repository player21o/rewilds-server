import { WebSocket } from "uWebSockets.js";
import {
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "../../common/constructors";

export type Ws = WebSocket<unknown> & { id?: number };
export type Peer = {
  send: <T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) => void;
  id: number;
  ws: Ws;
};

type Packets = {
  [Packet in keyof ConstructorsInnerTypes]: (
    arg0: Peer,
    ...args: ConstructorsInnerTypes[Packet]
  ) => {};
};

export default {
  pointer(_, __, ___) {},
  hello(_) {
    console.log("received hello packet from peer " + _.id);
  },
} as Packets;
