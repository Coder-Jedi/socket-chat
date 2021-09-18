const express = require('express')
const cors = require('cors')
const socket_io = require('socket.io')
const EventEmitter = require('events').EventEmitter //importing to send events internally within the server

const app = express()

app.use(cors())
app.use(express.json())

const server = app.listen(3001, () => {
  console.log('Server is running at port 3001...')
})

let io = socket_io(server)

let roomCounter = 0

const ee = new EventEmitter() // defining this array to communicate between two socket instances on the server itself without emitting to client

let boxArr;// = Array(9).fill("")
let roomName = ""

io.on('connection', (socket) => {

  // WRAPPER AROUND SOCKET TO KEEP TRACK OF EVENTS
  // socket = {
  //   ...s,
  //   on: function(...args) {
  //     console.log("CAUGHT", ...args)
  //     s.on(...args)
  //   },
  //   emit: function(...args) {
  //     console.log("EMITING", ...args)
  //     s.emit(...args)
  //   }
  // }

  let flag = false

  // console.log(io.sockets.sockets)
  // console.log(socket.handshake.query.user)

  socket.on('join_room', (data) => {
    socket.join(data.room)
    const socketRooms = Array.from(socket.rooms).splice(1)
    io.to(socket.id).emit('your_rooms', socketRooms)
  })

  socket.on('get_my_rooms', () => {
    const socketRooms = Array.from(socket.rooms).splice(1)
    io.to(socket.id).emit('your_rooms', socketRooms)
  })

  socket.on('disconnect_from_room', (room) => {
    socket.leave(room)

    const socketRooms = Array.from(socket.rooms).splice(1)
    io.to(socket.id).emit('your_rooms', socketRooms)
  })

  socket.on('accept_the_request', (flag_new) => {
    flag = flag_new
    console.log('this is the flag returned' + flag)
  })

  socket.on('conditional_event', (data) => {
    if (flag) console.log('Yeah, you are successful!' + data)
  })

  socket.on("clicked_box", ({playerSymbol, index}) => {
    // console.log(playerSymbol)
    boxArr[index] = playerSymbol;
    console.log({boxArr, roomName})
    io.to(roomName).emit("update_boxarr", boxArr)
  })

  io.sockets.emit('active_users', getActiveUsersInfo())

  socket.on('disconnect', () => {
    io.sockets.emit('active_users', getActiveUsersInfo())
  })

  //player1's 'invite_request' received at server(player1): step2
  socket.on('invite_user', (user) => {
    //server sending the 'respond_to_invite' request to player2 with details of player1 : step3
    io.to(user[0]).emit('respond_to_invite', {
      sid: socket.id,
      username: socket.handshake.query.user,
    })
    flag = true
    setTimeout(() => {
      flag = false
      console.log('timedout, flag: ' + flag)
    }, 15000)
  })
  //server(player1) receiving the 'invite_accepted' event and data about player2 from server(player2) internally with the player1 sid appended: step8
  ee.on(`invite_accepted_${socket.id}`, (player2) => {
    console.log('listening to invite_accepted, flag: ' + flag)

    //checking if the invite request is still valid: step9
    if (flag === true) {
      //then creating a new room and adding player1 and player2 to the room: step10
      roomCounter++
      roomName = `game_room_${roomCounter}`
      //adding player1
      socket.join(roomName)
      //adding player2
      player2Socket = io.sockets.sockets.get(player2.sid)
      player2Socket.join(roomName)

      boxArr = Array(9).fill("")
      io.to(roomName).emit("update_boxarr", boxArr)

      //server emitting the event 'game_started' to the new_game_room along with players data and room name: step11
      io.to(roomName).emit('game_started', {
        room: roomName,
        player1: { sid: socket.id, username: socket.handshake.query.user },
        player2: player2,
      })
    } else {
      //if the invite timedout, server(player1) is sending the event to player2 that the invite expired along with player1 details : step9(2.1.1)
      io.to(player2.sid).emit('invite_expired_player2', {
        sid: socket.id,
        username: socket.handshake.query.user,
      })
      //server(player1) is also sending the 'invite_expired' event to player1 along with player2 data : step9(2.1.2)
      io.to(socket.id).emit('invite_expired_player1', player2)
    }
  })

  //server(player2) received the game initiation request after the invite accept with details about player1: step6
  socket.on('invite_accept_initiated', (player1) => {
    //server sending the game initiation request to server(player1) with player2 data : step7
    //this won't work
    // io.to(user.sid).emit('invite_accepted', {
    //   sid: socket.id,
    //   username: socket.handshake.query.user,
    // })

    //emitting the event using node's event emitter
    //and the event name is appended at the end with player1's sid, who should receive this event: step7
    ee.emit(`invite_accepted_${player1.sid}`, {
      sid: socket.id,
      username: socket.handshake.query.user,
    })
  })

  //server(player2) received the event that player2 declined the invite along with player1 data : step5(2.2)
  socket.on('invite_decline_initiated', (player1) => {
    flag = false //not sure about the need for this assignment
    //server(player2) sending the event to the player1 that your invite was declined along with player2 data : step5(2.3)
    io.to(player1.sid).emit('your_invite_declined', {
      sid: socket.id,
      username: socket.handshake.query.user,
    })
    1
  })
})

function getActiveUsersInfo() {
  let usersMap = io.sockets.sockets
  let usersArr = []

  for (let [key, value] of usersMap) {
    usersArr.push({ sid: key, username: value.handshake.query.user })
  }
  console.log(usersArr)
  return usersArr
}

//array for list of rooms
const rooms = ['room1', 'room2', 'room3', 'room4']

function getIdsInRoom(room) {
  //converting the rooms map into a 2D list
  const arr = Array.from(io.sockets.adapter.rooms)

  //find the array for the given room name
  const roomArr = arr.find((value) => value[0] === room)

  //get the array of the socket ids in the room
  let roomIds = []
  let roomSocketsUser = []

  if (roomArr) roomIds = Array.from(roomArr[1])

  roomSocketsUser = roomIds.map((sid) => {
    let socketMap = io.sockets.sockets
    let sidSocket = socketMap.get(sid)
    let sidQuery = sidSocket.handshake.query

    return sidQuery.user
  })

  return roomSocketsUser
}

function getRoomsforId(id) {
  //converting the sids map into a 2D list
  const arr = Array.from(io.sockets.adapter.sids)

  //finding the mapped value for the id
  let sidMap = arr.find((value) => value[0] === id)

  return sidMap
}

function getRoomsData() {
  const arr = rooms.map((room) => {
    const ActiveIds = getIdsInRoom(room)

    return { room, ActiveIds }
  })

  return arr
}

app.get('/api/rooms', (req, res) => {
  res.send(getRoomsData())
})
