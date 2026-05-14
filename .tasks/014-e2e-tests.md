---
id: "014"
title: "E2E tests: luồng GV nhập thành tích + SKKN tiêu"
status: "done"
area: "qa"
agent: "@qa-engineer"
priority: "normal"
created_at: "2026-03-28"
prd_refs: ["FR-023", "FR-028", "FR-040", "FR-041"]
blocks: []
blocked_by: ["009", "010", "011"]
---

## Description

E2E tests cho các luồng nghiệp vụ quan trọng nhất — đặc biệt là SKKN tiêu vì đây là logic không thể sai.

## Acceptance Criteria

- [ ] `tests/e2e/auth.spec.ts` — login Admin, login GV, từ chối truy cập sai role
- [ ] `tests/e2e/skkn-consume.spec.ts`:
  - [ ] GV chọn CSTĐ Cách 2 → SKKN bị tiêu → hiển thị "Đã dùng — xét CSTĐ năm X"
  - [ ] GV không thể chọn SKKN đã tiêu để CSTĐ Cách 2 lần 2
  - [ ] Bằng khen TP: chọn đúng 2 SKKN → cả 2 bị tiêu
  - [ ] Bằng khen TP: từ chối SKKN ngoài 2 năm quy định
- [ ] `tests/e2e/admin-filter.spec.ts` — Admin lọc GV tiềm năng, xem kết quả đúng
- [ ] Dùng Page Object Model
- [ ] Dùng `data-testid` selectors (không dùng text hoặc CSS class)

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created |
