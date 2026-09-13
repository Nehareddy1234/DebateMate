import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'dm_token'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

function formatUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${API_BASE}${cleanUrl}`
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

export function useAuth() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Fetch wrapper that injects the bearer token and logs the user out on 401
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...(options.headers || {}) }
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json'
        }
        const fullUrl = formatUrl(url)
        const res = await fetch(fullUrl, { ...options, headers })
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY)
            setUser(null)
        }
        return res
    }, [])

    useEffect(() => {
        const token = getToken()
        if (!token) {
            setLoading(false)
            return
        }
        fetch(formatUrl('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unauthorized'))))
            .then(setUser)
            .catch(() => localStorage.removeItem(TOKEN_KEY))
            .finally(() => setLoading(false))
    }, [])

    const _store = (data) => {
        localStorage.setItem(TOKEN_KEY, data.access_token)
        setUser(data.user)
        return data.user
    }

    const _post = async (url, body) => {
        const fullUrl = formatUrl(url)
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
        return data
    }

    const register = useCallback(async (username, email, password) => {
        return _store(await _post('/auth/register', { username, email, password }))
    }, [])

    const login = useCallback(async (username, password) => {
        return _store(await _post('/auth/login', { username, password }))
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
    }, [])

    return { user, loading, login, register, logout, authFetch }
}

