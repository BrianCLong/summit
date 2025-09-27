import { Server } from "socket.io";
export const pubsub = {
  io: null as unknown as Server,
  init(io: Server){ this.io = io; },
  publish(channel: string, payload: any){ if(this.io) this.io.to(channel).emit("event", payload); },
  asyncIterator(channel: string){
    // Bridge to GraphQL subscription layer in your app
    return {
      async *[Symbol.asyncIterator](){ /* integrate with existing subscription impl */ }
    } as any;
  }
};