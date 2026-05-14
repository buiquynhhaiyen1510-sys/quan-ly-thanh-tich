'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Email hoặc mật khẩu không đúng')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        data-testid="login-form"
        className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          <p className="text-muted-foreground">
            Hệ thống quản lý thành tích giáo viên
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              data-testid="input-email"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              placeholder="email@truong.edu.vn"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              data-testid="input-password"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p data-testid="error-message" className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="btn-login"
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
