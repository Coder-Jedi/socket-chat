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

  const [boxArr, setBoxArr] = useState([
    "", "X", "",
    "O", "X", "",
    "", "", "O"
  ])

  //states to handle the game invite
  const [showInvite, setShowInvite] = useState(false)
  const [inviteData, setInviteData] = useState({ sid: '', username: '' })

  //states to handle game
  const [gameDetails, setGameDetails] = useState({})
  const [playerNum, setPlayerNum] = useState('')
  const [showGame, setShowGame] = useState(false)

  useEffect(() => console.log(activeUsers), [activeUsers])

  function getPlayerSymbol() {
    if (playerNum == 1) {
      return "X"
    }
    return "O"
  }

  function onClickJoin() {
    console.log('join button was clicked!')

      .emit('join_room', {
        room,
      })
  }
  function handleLogin() {
    socket = io('/', { query: `user=${user_name}` })

    socket.on('your_rooms', (data) => {
      setMyRooms(data)
    })

    socket.on('active_users', (data) => setActiveUsers(data))

    socket.on('game_on', (data) => {
      console.log('The game is on...' + data);
      setShowGame(true);
    })

    //player2 receiving the 'respond_to_invite' from server with data about player1: step4
    socket.on('respond_to_invite', (user) => {
      console.log(
        'respond_to_invite event caught ' + user.sid + ' ' + user.username,
      )
      setInviteData(user)
      setShowInvite(true)
    })

    //player2 receiving the 'invite_expired' event along with data about player1 from server(player1) : step9(2.2.1)
    socket.on('invite_expired_player2', (player1) => {
      //alerting the player2 that the invite has expired and closing the InviteModal and re-setting the InviteData
      alert(`The invite from ${player1.username} has expired.`)
      setShowInvite(false)
      setInviteData({ sid: '', username: '' })
    })

    //player1 receiving the 'invite_expired' event along with data about player2 from server(player1): step9(2.2.2)
    socket.on('invite_expired_player1', (player2) => {
      alert(`Your invite to ${player2.username} has expired.`)
    })

    //player1 receiving the 'your_invite_declined' event from server(player2) along with player2 data : step5(2.4)
    socket.on('your_invite_declined', (player2) => {
      alert(`Your invite to ${player2.username} was declined.`)
    })

    socket.on("update_boxarr", updatedBoxArr => {
      console.log('UPDATING BOX ARR', updatedBoxArr)
      setBoxArr(updatedBoxArr);
    })

    //players in the gameroom receiving the event that the game started successfully along with the details of the game room, player1 and player2 : step12
    socket.on('game_started', (game) => {
      setGameDetails(game)
      //checking and setting playerNum for the game
      let tempPlayerNum = ''
      if (game.player1.sid === socket.id) tempPlayerNum = '1'
      else tempPlayerNum = '2'
      setPlayerNum(tempPlayerNum)
      alert(`The game started and you are Player ${tempPlayerNum}...`)
      setShowGame(true)
    })

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

  //player1 sending the invite: step1
  function handleInvite() {
    console.log(document.getElementById('data').value.split(',,'))
    socket.emit(
      'invite_user',
      document.getElementById('data').value.split(',,'),
    )
  }
  //player2 accepted the invite, and sent the request to server to initiate game with the player1 data: step5
  function handleAcceptInvite() {
    socket.emit('invite_accept_initiated', inviteData)
    //resetting inviteData and closing the InviteModal
    setShowInvite(false)
    setInviteData({ sid: '', username: '' })
    setShowGame(true)
  }

  //player2 rejected the invite, and sent the request to server(player2) with player1 data: step5(2.1)
  function handleDeclineInvite() {
    socket.emit('invite_decline_initiated', inviteData)
    //resetting inviteData and closing the InviteModal
    setShowInvite(false)
    setInviteData({ sid: '', username: '' })
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
    return LoginScreen()
  return (
    <>
      {InviteModal()}
      {/* following div is for the game modal */}
      <div
        id="gameModal"
        className="Modal game"
        style={{ display: `${showGame ? 'block' : 'none'}` }}
      >
        <div className="mask">
          <div className="modalContainer">
            <div className="info"></div>
            <div className="content">
              {GameBoard()}
            </div>
            {/* {AcceptDeclineButtonsBelowBoard()} */}
          </div>
        </div>
      </div>
      <div className="App">
        {/* {JoinRoomsAndFetchData()} */}
        {/* {MyRooms()} */}
        {/* {AllRoomsAndUsers()} */}
        {/* {TestingEmit()} */}
        {ListOfActiveUsers()}
        {/* {OldGameBoard()} */}
      </div>
    </>
  )

  function GameBoard() {

    function handleBoxClick(index) {
      return function () {
        socket.emit("clicked_box", { playerSymbol: getPlayerSymbol(), index })
      }
    }

    return <div id="board" className="board">
      {boxArr.map((value, index) => (
        <div onClick={handleBoxClick(index)} id={`box${index}`} className={`box${value} box${index}`}>
          {value}
        </div>
      ))}
    </div>
  }

  function AcceptDeclineButtonsBelowBoard() {
    return <div className="buttons">
      <button className="accept" onClick={handleAcceptInvite}>
        Accept
      </button>
      <button className="decline" onClick={handleDeclineInvite}>
        Decline
      </button>
    </div>
  }

  function JoinRoomsAndFetchData() {
    return <>
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
    </>
  }

  function MyRooms() {
    return <div>
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
  }

  function AllRoomsAndUsers() {
    return <div>
      {data.map((value) => {
        return (
          <>
            <h2>Room: {value.room}</h2>
            <p>ActiveIds: {value.ActiveIds.join(', ')}</p>
          </>
        )
      })}
    </div>
  }

  function ListOfActiveUsers() {
    return <div>
      <select id="data">
        {activeUsers.map((item, key) => (
          <option key={item.sid} value={`${item.sid},,${item.username}`}>
            {item.username}
          </option>
        ))}
      </select>
      <button onClick={handleInvite}>Invite</button>
    </div>
  }

  function TestingEmit() {
    return <div>
      <button onClick={handleEmit}>Emit Accepted</button>
      <button onClick={handleConditionalEmit}>
        Emit Conditional Event
      </button>
    </div>
  }

  function OldGameBoard() {
    return <div id="board" className="board">
      {boxArr.map((value, index) => (
        <div id={`box${index}`} className={`box box${index}`}>
          {value}
        </div>
      ))}
    </div>
  }

  function InviteModal() {
    return <div
      id="inviteModal"
      className="Modal invite"
      style={{ display: `${showInvite ? 'block' : 'none'}` }}
    >
      <div className="mask">
        <div className="modalContainer">
          <div className="content">
            <p>{inviteData.username} has invited you for a game.</p>
          </div>
          <div className="buttons">
            <button className="accept" onClick={handleAcceptInvite}>
              Accept
            </button>
            <button className="decline" onClick={handleDeclineInvite}>
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  }

  function LoginScreen() {
    return <div>
      <input
        type="text"
        id="user_name"
        onChange={(e) => setUser_name(e.target.value)}
        value={user_name}
        placeholder="user name" />
      <button onClick={handleLogin}>Log In</button>
    </div>
  }
}

export default App
