import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const APP_PASSWORD = process.env.APP_PASSWORD || 'redcross'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === APP_PASSWORD) {
      // Set a secure cookie
      cookies().set('hifld-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function GET() {
  const authCookie = cookies().get('hifld-auth')
  return NextResponse.json({ authenticated: authCookie?.value === 'authenticated' })
}