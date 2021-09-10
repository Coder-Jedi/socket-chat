const express = require('express')
const cors = require('cors')
const socket_io = require('socket.io')

const app = express()

app.use(cors())
app.use(express.json())

const server = app.listen(3001, () => {
  console.log('Server is running at port 3001...')
})

let io = socket_io(server)

let flag = false

io.on('connection', (socket) => {
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

  io.sockets.emit('active_users', getActiveUsersInfo())

  socket.on('disconnect', () => {
    io.sockets.emit('active_users', getActiveUsersInfo())
  })

  socket.on('invite_user', (userSid) => {
    socket.join(userSid)
    io.to(userSid).emit('game_on', userSid)
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
