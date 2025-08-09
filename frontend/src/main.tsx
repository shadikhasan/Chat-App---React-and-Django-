// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import './index.css'

// Tiny auth gate: pass the element you want to protect
function RequireAuth(el: JSX.Element) {
  const has = !!localStorage.getItem('access')
  return has ? el : <Navigate to="/login" replace />
}

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
    { path: '/', element: RequireAuth(<Chat />) },                 // sidebar + empty chat
    { path: '/chat/:username', element: RequireAuth(<Chat />) },   // sidebar + room
    { path: '*', element: <Navigate to="/" replace /> },           // fallback
  ],
  {
    // ✅ Opt in to RR v7 behavior to remove warnings
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
