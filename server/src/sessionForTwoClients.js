import crypto from 'crypto'
import EventEmitter from 'events'

export const sessionForTwoClients = (server) => {
  let clients = []
  const emitter = new EventEmitter()

  const add = (client) => {
    if (clients.length > 1) {
      emitter.emit('client.rejected', client)
    } else {
      clients.push(client)
      emitter.emit('client.added', client, crypto.randomUUID())
      if (clients.length === 2) emitter.emit('ready')
    }
  }

  const remove = (clientToRemove) => {
    clients = clients.filter((client) => client !== clientToRemove)
    emitter.emit('client.removed', clientToRemove)
    if (clients.length < 2) emitter.emit('lost')
  }

  const getOppositeClient = (client) => {
    return clients.find((otherClient) => otherClient !== client)
  }

  server.on('connection', (client) => {
    add(client)
    client.on('close', () => remove(client))
  })

  return {
    getOppositeClient,
    get clients() {
      return clients
    },
    on: emitter.addListener.bind(emitter),
  }
}
