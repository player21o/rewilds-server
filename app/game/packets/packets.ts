import { WebSocket } from "uWebSockets.js";
import { Constructors, ObjectValuesToTuple } from "../../common/constructors";

export type Ws = WebSocket<unknown> & { id?: number };
export type Peer = {
  send: <T extends keyof Constructors>(
    msg: T,
    ...args: ObjectValuesToTuple<Constructors[T]>
  ) => void;
};

type Packets = {
  [Packet in keyof Constructors]: (
    arg0: Ws,
    ...args: ObjectValuesToTuple<Constructors[Packet]>
  ) => {};
};

export default {
  pointer(_, __, ___) {},
} as Packets;
