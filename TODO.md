# TODO / Backlog

> **Governor**: @project-manager — invoke for sprint planning, prioritization, and feature breakdown
> **Agents**: May add items to "Backlog" and move completed items to "Completed". Preserve section order. Never reorder items within a section — priority position is set by humans or @project-manager when explicitly asked.

---

## In Progress

_(trống)_

---

## Up Next (prioritized)
- [ ] #009 — UI GV: trang hồ sơ + form nhập thành tích [area: frontend] → [.tasks/009-teacher-ui.md](.tasks/009-teacher-ui.md)
- [ ] #010 — UI Admin: quản lý GV + xem/sửa thành tích [area: frontend] → [.tasks/010-admin-teacher-mgmt-ui.md](.tasks/010-admin-teacher-mgmt-ui.md)

---

## Backlog

- [ ] #011 — UI Admin: trang lọc GV tiềm năng [area: frontend] → [.tasks/011-admin-filter-ui.md](.tasks/011-admin-filter-ui.md)
- [ ] #012 — UI Admin: dashboard thống kê + cấu hình quy tắc [area: frontend] → [.tasks/012-admin-dashboard-ui.md](.tasks/012-admin-dashboard-ui.md)
- [ ] #011 — UI Admin: trang lọc GV tiềm năng [area: frontend] → [.tasks/011-admin-filter-ui.md](.tasks/011-admin-filter-ui.md)
- [ ] #012 — UI Admin: dashboard thống kê + cấu hình quy tắc [area: frontend] → [.tasks/012-admin-dashboard-ui.md](.tasks/012-admin-dashboard-ui.md)
- [ ] #013 — Xuất báo cáo Excel (thành tích + kết quả lọc) [area: backend] → [.tasks/013-excel-export.md](.tasks/013-excel-export.md)
- [ ] #014 — E2E tests: luồng GV nhập thành tích + SKKN tiêu [area: qa] → [.tasks/014-e2e-tests.md](.tasks/014-e2e-tests.md)
- [ ] #015 — User Guide cho GV và Admin [area: docs] → [.tasks/015-user-guide.md](.tasks/015-user-guide.md)

---

## Completed

- [x] #000 — Initial project setup and template configuration → [.tasks/000-initial-project-setup.md](.tasks/000-initial-project-setup.md)
- [x] #001 — Khởi tạo dự án Next.js + Prisma + Supabase + Auth → [.tasks/001-project-init.md](.tasks/001-project-init.md)
- [x] #002 — Database schema: GV, thành tích, SKKN, khen thưởng, quy tắc → [.tasks/002-database-schema.md](.tasks/002-database-schema.md)
- [x] #003 — Authentication: Admin tạo tài khoản GV, đổi mật khẩu → [.tasks/003-authentication.md](.tasks/003-authentication.md)
- [x] #004 — API CRUD hồ sơ giáo viên (Admin) → [.tasks/004-teacher-profile-api.md](.tasks/004-teacher-profile-api.md)
- [x] #005 — Logic SKKN tiêu: rule-driven consume engine (23 unit tests, 100% coverage) → [.tasks/005-skkn-consume-logic.md](.tasks/005-skkn-consume-logic.md)
- [x] #006 — API nhập thành tích: tích hợp SKKN consume vào competition-titles + awards + skkn/available → [.tasks/006-achievement-api.md](.tasks/006-achievement-api.md)
- [x] #007 — API CRUD EligibilityRule (Admin): GET/POST/PUT/PATCH/DELETE + Zod validation → [.tasks/007-rules-config-api.md](.tasks/007-rules-config-api.md)
- [x] #008 — Engine lọc GV tiềm năng: checkTeacherEligibility + runEligibilityCheck + GET /api/admin/eligibility (25 unit tests) → [.tasks/008-eligibility-engine.md](.tasks/008-eligibility-engine.md)

---

## Item Format Guide

```
- [ ] #NNN — Brief description [area: frontend|backend|database|qa|docs|infra|design|setup] → [.tasks/NNN-short-title.md](.tasks/NNN-short-title.md)
```
