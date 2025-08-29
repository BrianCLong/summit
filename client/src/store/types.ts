import { GraphDataState } from './graphSlice';
import { type SocketState } from './socketSlice';

export interface RootState {
  graphData: GraphDataState;
  socket: SocketState;
}
