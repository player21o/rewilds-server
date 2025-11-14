// game.ts
import { EntitiesManager } from "./entities";
import { Player } from "./entities/player";
import { GameNetworking } from "./networking";

export class GameServer {
  private entities: EntitiesManager;
  private entities_updates: any = [];
  private network: GameNetworking;

  private last_time: number = Date.now();

  constructor(port: number, tickrate: number, upd_tickrate: number) {
    this.network = new GameNetworking(port, (peer) => {
      const citizen = new Player(
        "hero",
        "male",
        "hui",
        Math.random() * 50 + 100,
        Math.random() * 50 + 100,
        this.entities
      );
      citizen.weapon = "axe";
      citizen.shield = "shield_wooden";
      citizen.team = (this.entities.entities_count % 2) as 0 | 1;
      this.entities.add(citizen);
      peer.citizen = citizen;
    });

    this.entities = new EntitiesManager(this.network);

    /*
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 3; y++) {
        this.entities.add(
          new TestBot(
            "hero",
            "male",
            "test",
            x * 50 + 50,
            y * 50 + 50,
            this.entities
          )
        );
      }
    }
      */

    /*
    this.entities.add(
      new TestBot("hero", "male", "test", 1 * 100, 1 * 100, this.entities)
    );
    */

    this.launch_game_loop(tickrate, upd_tickrate);
  }

  private game_loop(ticks: number) {
    const now = Date.now();
    const dt = (now - this.last_time) / 1000; // dt in seconds
    this.last_time = now;

    this.entities_updates.push(
      ...this.entities.update(dt).map((u: any) => [u[0], u[2], ...u[1]])
    );

    const tickLength = 1000 / ticks;
    setTimeout(() => this.game_loop(ticks), tickLength);
  }

  private launch_game_loop(ticks: number, update_ticks: number) {
    this.game_loop(ticks);

    setInterval(() => {
      if (this.entities_updates.length > 0)
        this.network.broadcast("update", this.entities_updates);
      this.entities_updates = [];
    }, 1000 / update_ticks);

    setInterval(() => {
      this.network.peers.forEach((p) => {
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

          setTimeout(() => {
            if (p.citizen != null) p.send("your_sid", p.citizen.sid);
          }, 100);
        }
      });
    }, 1000 / 5);
  }
}
