// game.ts
import { App, DISABLED, TemplatedApp } from "uWebSockets.js";
import {
  constructors_inner_keys,
  constructors_keys,
  constructors_object,
  ConstructorsInnerTypes,
  ConstructorsObject,
} from "./common/constructors";
import packets, { Peer, Ws } from "./game/packets/packets";
import { EntitiesManager } from "./game/entities";
import { Citizen } from "./game/entities/citizen";
import { pack, unpack } from "msgpackr";

export class GameServer {
  private peers: Peer[] = [];
  private peer_id_count: number = 0;
  private peer_ids: { [id: number]: Peer } = {};
  private entities = new EntitiesManager();
  private entities_updates: any = [];

  private app: TemplatedApp;

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number, upd_tickrate: number) {
    this.launch_game_loop(tickrate, upd_tickrate);

    /*
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        const c = new Citizen("hero", "pidor", 30 * x + 100, 30 * y + 100);
        c.gender = ["male", "female"][Math.round(Math.random())] as
          | "male"
          | "female";
        c.team = Math.round(Math.random() * 2);
        this.entities.add(c);
      }
    }
      */

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

          const citizen = new Citizen(
            "hero",
            "hui",
            Math.random() * 50 + 100,
            Math.random() * 50 + 100
          );
          citizen.weapon = "axe";
          citizen.shield = "shield_wooden";
          citizen.team = 1;
          this.entities.add(citizen);
          peer.citizen = citizen;
        },
        message: (ws: Ws, msg) => {
          const packet: [packet: number, any[]] = unpack(
            new Uint8Array(msg)
          ) as any;

          const formatted: any[] = [];
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

          packets[constructor_name](
            this.peer_ids[ws.id!],
            ...(formatted as any)
          );
        },
      })
      .listen(port, () => {});
  }

  private broadcast<T extends keyof ConstructorsObject>(
    msg: T,
    ...args: ConstructorsInnerTypes[T]
  ) {
    this.app.publish("global", pack(this.construct_packet(msg, ...args)), true);
  }

  private construct_packet<T extends keyof ConstructorsObject>(
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

  private send<T extends keyof ConstructorsObject>(
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

  private game_loop(ticks: number) {
    const now = Date.now();
    const dt = (now - this.last_time) / 1000; // dt in seconds
    this.last_time = now;

    // Your exact same update logic
    this.entities_updates.push(
      ...this.entities.update(dt).map((u: any) => [u[0], u[2], ...u[1]])
    );

    // --- The key change is here ---
    // Schedule the next execution of the loop
    const tickLength = 1000 / ticks;
    setTimeout(() => this.game_loop(ticks), tickLength);
  }

  private launch_game_loop(ticks: number, update_ticks: number) {
    setInterval(() => {
      const dt = (Date.now() - this.last_time) / 1000;

      this.entities_updates.push(
        ...this.entities.update(dt).map((u) => [u[0], u[2], ...u[1]])
      );

      this.last_time = Date.now();
      //console.log(dt);
    }, 1000 / ticks);

    this.last_time = Date.now();

    this.game_loop(ticks);

    setInterval(() => {
      this.broadcast("update", this.entities_updates);
      this.entities_updates = [];
    }, 1000 / update_ticks);

    setInterval(() => {
      this.peers.forEach((p) => {
        if (
          p.helloed &&
          p.citizen != null &&
          p.citizen.private_data_changes.bits != 0b0
        ) {
          p.send(
            "private",
            p.citizen.private_data_changes.bits,
            p.citizen.private_data_changes.data
          );
          p.citizen.private_data_changes.bits = 0b0;
          p.citizen.private_data_changes.data = [];
        }

        if (p.helloed && !p.welcomed) {
          p.welcomed = true;
          p.send("snapshot", this.entities.snapshot);
          if (p.citizen != null) p.send("your_sid", p.citizen.sid);
        }
      });
    }, 1000 / 5);
  }
}
