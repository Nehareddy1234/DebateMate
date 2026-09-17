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
    const [token, setToken] = useState(() => getToken())
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Fetch wrapper that injects the bearer token and logs the user out on 401
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...(options.headers || {}) }
        const currentToken = getToken()
        if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json'
        }
        const fullUrl = formatUrl(url)
        const res = await fetch(fullUrl, { ...options, headers })
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
            setUser(null)
        }
        return res
    }, [])

    useEffect(() => {
        const currentToken = getToken()
        if (!currentToken) {
            setLoading(false)
            return
        }
        fetch(formatUrl('/auth/me'), { headers: { Authorization: `Bearer ${currentToken}` } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unauthorized'))))
            .then((userData) => {
                setUser(userData)
                setToken(currentToken)
            })
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY)
                setToken(null)
                setUser(null)
            })
            .finally(() => setLoading(false))
    }, [])

    const _store = (data) => {
        localStorage.setItem(TOKEN_KEY, data.access_token)
        setToken(data.access_token)
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
        if (!res.ok) {
            let msg = data.detail
            if (Array.isArray(data.detail)) {
                msg = data.detail.map(d => d.msg || `${d.loc?.slice(-1)[0] || 'field'}: invalid`).join(', ')
            } else if (typeof data.detail === 'object' && data.detail !== null) {
                msg = JSON.stringify(data.detail)
            }
            throw new Error(msg || `Request failed (${res.status})`)
        }
        return data
    }

    const register = useCallback(async (username, email, password) => {
        return _store(await _post('/auth/register', { username, email, password }))
    }, [])

    const login = useCallback(async (username, password) => {
        return _store(await _post('/auth/login', { username, password }))
    }, [])

    const resetPassword = useCallback(async (username, email, newPassword) => {
        return _store(await _post('/auth/reset-password', {
            username,
            email,
            new_password: newPassword,
        }))
    }, [])

    const changePassword = useCallback(async (oldPassword, newPassword) => {
        const res = await authFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            let msg = data.detail
            if (Array.isArray(data.detail)) {
                msg = data.detail.map(d => d.msg || `${d.loc?.slice(-1)[0] || 'field'}: invalid`).join(', ')
            } else if (typeof data.detail === 'object' && data.detail !== null) {
                msg = JSON.stringify(data.detail)
            }
            throw new Error(msg || `Failed to change password (${res.status})`)
        }
        return data
    }, [authFetch])

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
    }, [])

    return { token, user, loading, login, register, resetPassword, changePassword, logout, authFetch }
}


