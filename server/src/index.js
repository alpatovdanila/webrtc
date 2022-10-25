import { WebSocketServer } from 'ws'
import { JSONMessages } from './JSONMessages.js'
import { sessionForTwoClients } from './sessionForTwoClients.js'

const server = new WebSocketServer({ port: 9090 })
const messages = JSONMessages(server)
const session = sessionForTwoClients(server)

const broadcast = (message) => {
  session.clients.forEach((client) => {
    messages.send(message, client)
  })
}

session.on('ready', () => broadcast({ type: 'signaling.ready' }))

session.on('lost', () => broadcast({ type: 'signaling.lost' }))

session.on('client.rejected', (client) => client.terminate())

session.on('client.added', (client, id) => {
  messages.send(
    {
      type: 'connected',
      payload: { id, isAplha: session.clients.length === 1 },
    },
    client
  )
})

messages.on('message', (message, client) => {
  if (['offer', 'answer', 'candidate'].includes(message.type)) {
    messages.send(message, session.getOppositeClient(client))
  }
})
