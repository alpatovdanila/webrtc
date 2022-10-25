const state = {
  connection: null,
  signaling: null,
  rtc: null,
  isAplha: null,
}

const setState = (newState) => {
  Object.assign(state, newState)

  document.querySelector('title').textContent = `
    ${state.isAplha ? '🡥' : '🡦'}
    ws${state.connection ? '🟢' : '🔴'}
    sgnl${state.signaling ? '🟢' : '🔴'}
    rtc${state.rtc ? '🟢' : '🔴'}
  `
}

setState({ signaling: false, rtc: false, connection: false, isApha: false })

const client = new WebSocket(`ws://localhost:9090`)

const rtc = new RTCPeerConnection({
  iceServers: [
    {
      urls: 'stun:openrelay.metered.ca:80',
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
})

let channel = null

document.addEventListener('click', () => {
  channel.send(JSON.stringify({ message: 'Hello from the other side!' }))
})

rtc.onicecandidate = function (event) {
  if (event.candidate) {
    send({
      type: 'candidate',
      payload: { candidate: event.candidate },
    })
  }
}

rtc.oniceconnectionstatechange = console.log
const send = (data) => client.send(JSON.stringify(data))

rtc.onnegotiationneeded = () => console.log('negotiation needed')

client.onclose = () => {
  setState({ signaling: false, connection: false })
}

client.onmessage = async (e) => {
  const data = JSON.parse(e.data)
  const { type, payload } = data

  if (type === 'connected') {
    setState({
      connection: true,
      connectionId: payload.id,
      caller: payload.caller,
    })
  }

  if (type === 'offer') {
    await rtc.setRemoteDescription(new RTCSessionDescription(payload.offer))
    const answer = await rtc.createAnswer()
    await rtc.setLocalDescription(answer)

    send({
      type: 'answer',
      payload: { answer },
    })
  }

  if (type === 'answer') {
    rtc.setRemoteDescription(new RTCSessionDescription(payload.answer))
  }

  if (type === 'candidate') {
    rtc.addIceCandidate(new RTCIceCandidate(payload.candidate))
  }

  if (type === 'signaling.ready') {
    console.log('signaling ready')
    setState({ signaling: true })

    if (status.caller) {
      channel = rtc.createDataChannel('chat channel')
      console.log('created host channel', channel)
      const offer = await rtc.createOffer()
      await rtc.setLocalDescription(offer)
      channel.onmessage = (m) => console.log('remote message received', m.data)

      send({
        type: 'offer',
        payload: { offer },
      })
    } else {
      rtc.ondatachannel = (ev) => {
        channel = ev.channel
        console.log('remote data channel received', channel)
        channel.onmessage = (m) =>
          console.log('remote message received', m.data)
      }
    }
  }

  if (type === 'signaling.lost') {
    setState({ signaling: false })
  }
}

window.onbeforeunload = () => client.close()
