import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '@/lib/api-helpers'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// POST /api/teacher/upload — upload minh chứng to Cloudinary
export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Chức năng tải file chưa được cấu hình. Liên hệ Admin.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Không đọc được form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Chỉ chấp nhận PDF hoặc ảnh (JPG, PNG, WEBP)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File quá lớn (tối đa 10 MB)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'giao-vien-thanh-tich/minh-chung',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          },
          (err, res) => {
            if (err || !res) reject(err ?? new Error('Upload thất bại'))
            else resolve(res as typeof result)
          }
        )
        .end(buffer)
    }
  )

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    name: file.name,
    fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
  })
}
