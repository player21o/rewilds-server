import { App, DISABLED, TemplatedApp } from "uWebSockets.js";
import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "../common/constructors";
import { pack, unpack } from "msgpackr";
import packets, { Peer, Ws } from "./packets/packets";

export class GameNetworking {
  public app: TemplatedApp;
  public peers: Peer[] = [];
  private peer_id_count: number = 0;
  private peer_ids: { [id: number]: Peer } = {};

  constructor(port: number, onOpen: (peer: Peer) => void) {
    this.app = App({})
      .ws("/*", {
        compression: DISABLED,
        close: (ws: Ws) => {
          this.peers = this.peers.filter((p) => p.id != ws.id!);
          delete this.peer_ids[ws.id!];
        },
        open: (ws: Ws) => {
          const peer: Peer = {
            send: (msg, ...args) => {
              this.send(peer.id, msg, ...args);
            },
            id: this.peer_id_count,
            ws: ws,
            citizen: null,
            helloed: false,
            welcomed: false,
          };

          ws.id = peer.id;
          ws.subscribe("global");

          this.peers.push(peer);
          this.peer_ids[ws.id!] = peer;
          this.peer_id_count += 1;

          onOpen(peer);
        },
        message: (ws: Ws, msg) => {
          const packet: [packet: number, any[]] = unpack(
            new Uint8Array(msg)
          ) as any;

          const formatted: ConstructorsInnerTypes[keyof ConstructorsObject][] =
            [];
          const sliced = packet[1];
          const constructor_name = constructors_keys[packet[0]];
          const constructor = constructors_object[constructor_name];
          const props = constructors_inner_keys[constructor_name];

          for (let i = 0, n = sliced.length; i < n; ++i) {
            const propName = props[i] as keyof typeof constructor;
            const converterPair = constructor[propName] as readonly [
              (val: any) => any,
              (val: any) => any
            ];

            formatted.push(converterPair[1](sliced[i]));
          }

          //@ts-ignore
          packets[constructor_name](this.peer_ids[ws.id!], ...formatted);
        },
      })
      .listen(port, () => {});
  }

  public broadcast<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    this.app.publish("global", pack(this.construct_packet(msg, ...args)), true);
  }

  public construct_packet<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    const constructor = constructors_object[msg];

    const data = constructors_inner_keys[msg].map((prop, i) => {
      const propName = prop as keyof typeof constructor;
      const converterPair = constructor[propName] as readonly [
        (val: any) => any,
        (val: any) => any
      ];

      return converterPair[0](args[i]);
    });

    return [constructors_keys.indexOf(msg), data];
  }

  public send<T extends keyof ConstructorsObject>(
    peer_id: keyof typeof this.peer_ids,
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    if (this.peer_ids[peer_id] != undefined)
      this.peer_ids[peer_id].ws.send(
        pack(this.construct_packet(msg, ...args)),
        true
      );
  }
}
