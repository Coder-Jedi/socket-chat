import React from 'react'

function LoginScreen({handleLogin}) {
    return (
        <div>
            <input
                type="text"
                id="user_name"
                placeholder="user name" />
            <button onClick={handleLogin}>Log In</button>
        </div>
    )
}

export default LoginScreen
