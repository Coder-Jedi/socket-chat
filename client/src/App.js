import './App.css'
import io from 'socket.io-client'
import { useEffect, useState } from 'react'

let socket

function App() {
  const [room, setRoom] = useState('room1')
  const [user_name, setUser_name] = useState('')
  const [data, setData] = useState([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [myRooms, setMyRooms] = useState([])
  const [flag, setFlag] = useState(false)

  const [activeUsers, setActiveUsers] = useState([])

  const [boxArr, setBoxArr] = useState(Array(9).fill('X'))

  useEffect(() => console.log(activeUsers), [activeUsers])

  function onClickJoin() {
    console.log('join button was clicked!')
    socket.emit('join_room', {
      room,
    })
  }
  function handleLogin() {
    socket = io('/', { query: `user=${user_name}` })

    socket.on('your_rooms', (data) => {
      setMyRooms(data)
    })

    socket.on('active_users', (data) => setActiveUsers(data))

    socket.on('game_on', (data) => console.log('The game is on...' + data))

    setLoggedIn(true)
  }

  function getMyRooms() {
    socket.emit('get_my_rooms')
  }
  function handleDisconnect(room) {
    socket.emit('disconnect_from_room', room)
  }

  function handleEmit() {
    socket.emit('accept_the_request', !flag)
    setFlag((oldFlag) => !oldFlag)
  }
  function handleConditionalEmit() {
    socket.emit('conditional_event', 'Yo! it worked')
  }

  function handleInvite() {
    console.log(document.getElementById('data').value.split(',,'))
    socket.emit(
      'invite_user',
      document.getElementById('data').value.split(',,')[0],
    )
  }

  async function fetchData() {
    try {
      const result = await (
        await fetch('http://localhost:3001/api/rooms')
      ).json()
      setData(result)
    } catch (error) {
      console.error(error)
    }
  }

  if (!loggedIn)
    return (
      <>
        <div>
          <input
            type="text"
            id="user_name"
            onChange={(e) => setUser_name(e.target.value)}
            value={user_name}
            placeholder="user name"
          />
          <button onClick={handleLogin}>Log In</button>
        </div>
      </>
    )
  else {
    return (
      <>
        <div className="App">
          <div className="gamedetails">
            <select
              id="room"
              onChange={(e) => setRoom(e.target.value)}
              value={room}
              placeholder="room"
            >
              <option value="room1">Room-1</option>
              <option value="room2">Room-2</option>
              <option value="room3">Room-3</option>
              <option value="room4">Room-4</option>
            </select>

            <button onClick={onClickJoin}>Join Room</button>
          </div>
          <div>
            <button onClick={fetchData}>Fetch Data</button>
          </div>
          <div>
            <button onClick={getMyRooms}>My Rooms</button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2>My Rooms:</h2>
              {myRooms.map((value) => {
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <h3>Room: {value}</h3>
                    <button
                      onClick={() => handleDisconnect(value)}
                      style={{ height: 'max-content' }}
                    >
                      Disconnect from this Room
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            {data.map((value) => {
              return (
                <>
                  <h2>Room: {value.room}</h2>
                  <p>ActiveIds: {value.ActiveIds.join(', ')}</p>
                </>
              )
            })}
          </div>
          <div>
            <button onClick={handleEmit}>Emit Accepted</button>
            <button onClick={handleConditionalEmit}>
              Emit Conditional Event
            </button>
          </div>
          <div>
            <select id="data">
              {activeUsers.map((item, key) => (
                <option key={item.sid} value={`${item.sid},,${item.username}`}>
                  {item.username}
                </option>
              ))}
            </select>
            <button onClick={handleInvite}>Invite</button>
          </div>
          <div id="board" className="board">
            {boxArr.map((value, index) => (
              <div id={`box${index}`} className={`box box${index}`}>
                {value}
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }
}

export default App
