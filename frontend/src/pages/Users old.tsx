import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'
import type { UserPublic } from '../types'

export default function Users(){
  const [users, setUsers] = useState<UserPublic[]>([])
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    api.get<UserPublic[]>('/chat/users/').then(r => setUsers(r.data))
    api.get('/auth/me/').then(r => setMe(r.data.username))
  }, [])

  function logout(){ localStorage.clear(); window.location.href = '/login' }

  return (
    <div style={{maxWidth:720, margin:'24px auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Users</h2>
        <div>
          <span style={{marginRight:12}}>Signed in as <b>{me}</b></span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <ul>
        {users.map(u => (
          <li key={u.id}><Link to={`/chat/${u.username}`}>@{u.username}</Link></li>
        ))}
      </ul>
    </div>
  )
}
