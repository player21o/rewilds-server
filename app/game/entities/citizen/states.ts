import { Citizen } from ".";
import { States } from "../state";

export default {
  idle: {
    step(_dt, _entity, _manager) {},
  },
} as States<Citizen, Citizen["state"]>;
