import { io } from 'socket.io-client'
import { store } from './store'

const socket = io()

socket.on('graph_change', (msg) => {
  store.dispatch({ type: 'GRAPH_CHANGE', payload: { nodes: msg.data.nodes, edges: msg.data.edges } })
})

export default socket
