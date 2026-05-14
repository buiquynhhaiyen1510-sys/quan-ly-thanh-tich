---
id: "013"
title: "Xuất báo cáo Excel"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "low"
created_at: "2026-03-28"
prd_refs: ["FR-044", "FR-051"]
blocks: ["011"]
blocked_by: ["006", "008"]
---

## Description

Xuất dữ liệu ra file .xlsx cho 2 use case: thành tích toàn trường và kết quả lọc GV tiềm năng.

## Acceptance Criteria

- [ ] Cài đặt thư viện `xlsx` (SheetJS)
- [ ] `GET /api/admin/export/achievements?year=2024-2025` — xuất thành tích tất cả GV theo năm
- [ ] `GET /api/admin/export/eligibility?ruleId=X&year=Y` — xuất kết quả lọc tiềm năng
- [ ] File Excel có header rõ ràng, tiếng Việt, dữ liệu đúng format
- [ ] Response header đúng: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created |
