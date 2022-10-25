import { EventEmitter } from 'node:events'

export const JSONMessages = (server) => {
  const emitter = new EventEmitter()

  server.on('connection', (connection) => {
    connection.on('message', (message) => {
      const data = JSON.parse(message) || {}
      emitter.emit('message', data, connection)
    })
  })

  const send = (message, connection) => connection.send(JSON.stringify(message))

  const on = (event, handler) => emitter.addListener(event, handler)

  return { send, on }
}
