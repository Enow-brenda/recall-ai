import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader } from '../components/FullScreenLoader'

export function AuthCallback() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  useEffect(() => {
    void (async () => {
      await refresh()
      navigate('/chat', { replace: true })
    })()
  }, [refresh, navigate])

  return <FullScreenLoader label="Signing you in…" />
}