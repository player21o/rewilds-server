import { CitizenType } from "../../common/interfaces";
import { Entity } from "./entity";

export class Citizen extends Entity<"Citizen"> implements CitizenType {
  public name: string;
  public x: number;
  public y: number;
  public direction = 0;
  public health = 10;

  public keys = 0;

  public constructor(name: string, x: number, y: number) {
    super("Citizen");

    this.name = name;
    this.x = x;
    this.y = y;
  }

  public step(dt: number) {
    //w, a, s, d
    const final_vector = [0, 0];

    [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]
      .map((vec, i) => ((this.keys >> i) % 2 != 0 ? [0, 0] : vec))
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

    this.x += 300 * final_vector[0] * dt;
    this.y += 300 * final_vector[1] * dt;
  }
}
