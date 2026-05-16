import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '@/lib/api-helpers'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// GET /api/teacher/upload — trả về signed params để browser upload thẳng lên Cloudinary
// File không đi qua server → không bị giới hạn body size của Vercel
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Cloudinary chưa được cấu hình. Liên hệ Admin.' },
      { status: 503 }
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'giao-vien-thanh-tich/minh-chung'

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  )

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  })
}
