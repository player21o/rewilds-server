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
};

type Packets = {
  [Packet in keyof ConstructorsInnerTypes]: (
    arg0: Ws,
    ...args: ConstructorsInnerTypes[Packet]
  ) => {};
};

export default {
  pointer(_, __, ___) {},
} as Packets;
