import * as XLSX from 'xlsx'

export type SheetRow = Record<string, string | number | boolean | null | undefined>

export function buildWorkbook(sheets: { name: string; rows: SheetRow[] }[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const ws = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['(Không có dữ liệu)']])
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  return wb
}

export function excelResponse(wb: XLSX.WorkBook, filename: string): Response {
  // xlsx types are loose; cast via unknown to satisfy TypeScript's BlobPart constraint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([data as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  return new Response(blob, {
    headers: {
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
