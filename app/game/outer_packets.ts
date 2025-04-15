export type Peer = {
  send: (msg: any) => void;
};

export const outer_packets = {
  say: (system: boolean, text: string) => ["say", { system, text }],
};
