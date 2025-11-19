# Next.js 마이그레이션 문서

Rails 8 기반 Gini AI 프로젝트를 Next.js + FDP 백엔드 아키텍처로 마이그레이션하기 위한 설계 문서입니다.

## 📚 문서 목록

### 1. [마이그레이션 계획](./NEXTJS_MIGRATION_PLAN.md)
**전체 마이그레이션 로드맵 및 전략**

- ✅ Greenfield 전략 (새로 구축)
- ✅ 10주 단계별 일정 (Phase 1~7)
- ✅ 기술 스택 비교 (Rails vs Next.js)
- ✅ 리스크 대응 전략 5가지
- ✅ 비용 분석: **월 $30 절감**
- ✅ 성공 기준 및 다음 단계

**읽기 순서**: 🥇 **가장 먼저 읽기**

---

### 2. [Prisma 스키마](./NEXTJS_PRISMA_SCHEMA.md)
**데이터베이스 스키마 설계 및 구현 가이드**

- ✅ 11개 테이블 설계
  - 기존 7개: Organization, User, Project, Document, Scene, Asset, RenderJob
  - NextAuth 2개: Account, Session
  - ReBAC 2개: RelationTuple, RelationDefinition
- ✅ 완전한 Prisma 스키마 코드
- ✅ Supabase PostgreSQL 연동
- ✅ Seed 데이터 스크립트
- ✅ 마이그레이션 가이드

**읽기 순서**: 🥈 **두 번째** (인프라 설정 후)

---

### 3. [시스템 아키텍처](./NEXTJS_ARCHITECTURE.md)
**5개 레이어 아키텍처 및 기술 스택**

- ✅ 5개 레이어 구조
  - Client Layer (React)
  - API Layer (Next.js API Routes)
  - Business Logic Layer (Inngest)
  - Data Layer (Prisma + Supabase)
  - External Services Layer
- ✅ 기술 스택 상세
- ✅ 데이터 플로우 4가지
- ✅ 디렉토리 구조 가이드
- ✅ 핵심 컴포넌트 구현 예시

**읽기 순서**: 🥉 **세 번째** (아키텍처 이해)

---

### 4. [API 설계](./NEXTJS_API_DESIGN.md)
**Next.js App Router API Routes 설계**

- ✅ 프로젝트 API (CRUD + 렌더링)
  - GET, POST, PATCH /api/projects
  - POST /api/projects/[id]/render
- ✅ 문서 API
  - POST /api/documents
- ✅ 웹훅 API
  - POST /api/webhooks/did
- ✅ ReBAC 권한 체크 패턴
- ✅ 실제 구현 코드 예시

**읽기 순서**: 🔧 **구현 시 참조**

---

### 5. [백그라운드 작업](./NEXTJS_BACKGROUND_JOBS.md)
**Inngest 기반 백그라운드 작업 워크플로우**

- ✅ Inngest 함수 12개 설계
  1. DocumentParser - PDF 검증
  2. ScriptGenerator - 대본 생성
  3. AvatarDesignGenerator - 커스텀 아바타
  4. SceneProcessor - 씬 순차 처리 오케스트레이터
  5. TtsGenerator - TTS 생성
  6. AvatarGenerator - D-ID 아바타
  7. AvatarPoller - D-ID 폴링
  8. BackgroundGenerator - 배경 생성
  9. VeoGenerator - Veo 영상
  10. VeoPoller - Veo 폴링
  11. VideoCompositor - 비디오 합성 트리거
  12. VideoRender - AWS Lambda 호출
- ✅ 순차 처리 워크플로우
- ✅ 폴링 패턴 (D-ID, Veo 3.1)
- ✅ Inngest 특징 활용 (재시도, waitForEvent, sleep)

**읽기 순서**: 🔧 **구현 시 참조**

---

## 🎯 핵심 아키텍처 결정

| 구성 요소 | 기술 선택 | 이유 |
|-----------|----------|------|
| **데이터베이스** | Supabase PostgreSQL | FDP 표준, Realtime 지원, 무료 1GB |
| **ORM** | Prisma | TypeScript 타입 안정성, 마이그레이션 우수 |
| **인증** | NextAuth.js | OAuth 간편 연동 (Google, GitHub) |
| **권한** | ReBAC | 확장 가능한 권한 상속 구조 |
| **백그라운드 작업** | Inngest | Vercel 친화적, 긴 실행 시간, 무료 티어 |
| **FFmpeg 처리** | AWS Lambda | Vercel 실행 시간 제한 회피 |
| **파일 저장** | Supabase Storage | PostgreSQL 통합, CDN 내장, 무료 1GB |
| **실시간 통신** | Supabase Realtime | Action Cable 대체, PostgreSQL 통합 |
| **배포** | Vercel Pro | Next.js 최적화, 자동 스케일링 |

---

## 💰 비용 효율

### 월 100개 프로젝트 기준

| 구분 | Rails | Next.js | 차이 |
|------|-------|---------|------|
| **API 비용** | $536 | $536 | $0 |
| **인프라 비용** | $60 | $30 | **-$30** |
| **총 비용** | **$596** | **$566** | **-$30 (5% 절감)** |

### 인프라 비용 상세

| 항목 | Rails | Next.js | 차이 |
|------|-------|---------|------|
| 서버/호스팅 | $50 (Heroku) | $20 (Vercel Pro) | **-$30** |
| 데이터베이스 | $0 (SQLite) | $0 (Supabase Free) | $0 |
| Queue | $0 (Solid Queue) | $0 (Inngest Free) | $0 |
| Storage | $10 (S3) | $0 (Supabase Free) | **-$10** |
| FFmpeg | $0 (서버 내장) | $10 (AWS Lambda) | **+$10** |

---

## 📊 개발 일정 (10주)

| Phase | 기간 | 작업 내용 |
|-------|------|----------|
| **Phase 1** | 1주 | 인프라 설정 (Supabase, Vercel, Inngest, AWS) |
| **Phase 2** | 1주 | 데이터베이스 및 인증 (Prisma, NextAuth, ReBAC) |
| **Phase 3** | 2주 | API 및 서비스 레이어 (API Routes, 외부 서비스) |
| **Phase 4** | 2주 | 백그라운드 작업 (Inngest 12개, AWS Lambda FFmpeg) |
| **Phase 5** | 2주 | 프론트엔드 (페이지, 컴포넌트, Realtime) |
| **Phase 6** | 1주 | 데이터 마이그레이션 (SQLite → PostgreSQL, 파일) |
| **Phase 7** | 1주 | 테스트 및 배포 (Unit, E2E, Staging, Production) |

---

## 🚀 시작하기

### 1. 마이그레이션 계획 검토
```bash
# 마이그레이션 계획 읽기
open docs/nextjs-migration/NEXTJS_MIGRATION_PLAN.md
```

### 2. Phase 1 시작 (인프라 설정)
- [ ] Supabase 프로젝트 생성
- [ ] Vercel 프로젝트 생성
- [ ] Inngest 계정 설정
- [ ] AWS Lambda 함수 생성 (FFmpeg)
- [ ] OAuth 앱 생성 (Google, GitHub)

### 3. Phase 2 시작 (DB 및 인증)
- [ ] Prisma 스키마 작성
- [ ] NextAuth.js 설정
- [ ] ReBAC 권한 시스템 구현
- [ ] Seed 데이터 생성

### 4. 이후 Phase 순차 진행
- Phase 3~7 순서대로 진행

---

## 📖 참고 문서

### 현재 Rails 아키텍처
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 현재 시스템 아키텍처
- [WORKFLOW.md](../WORKFLOW.md) - 현재 워크플로우
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - 현재 데이터베이스 스키마
- [JOBS_GUIDE.md](../JOBS_GUIDE.md) - 현재 백그라운드 작업
- [SERVICES_GUIDE.md](../SERVICES_GUIDE.md) - 현재 서비스 레이어
- [API_INTEGRATION.md](../API_INTEGRATION.md) - 현재 외부 API 연동

### 외부 참고 자료
- [FDP 백엔드 아키텍처 스킬](../../.claude/skills/fdp-backend-architect/)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Inngest 공식 문서](https://www.inngest.com/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [NextAuth.js 공식 문서](https://next-auth.js.org/)

---

## ✅ 체크리스트

### 설계 완료
- [x] 마이그레이션 전략 수립
- [x] Prisma 스키마 설계
- [x] 아키텍처 설계
- [x] API 설계
- [x] 백그라운드 작업 설계

### Phase 1: 인프라 설정
- [ ] Supabase 프로젝트 생성
- [ ] Vercel 프로젝트 생성
- [ ] Inngest 계정 설정
- [ ] AWS Lambda 함수 생성
- [ ] OAuth 앱 생성

### Phase 2: 데이터베이스 및 인증
- [ ] Prisma 스키마 작성
- [ ] Prisma 마이그레이션 실행
- [ ] NextAuth.js 설정
- [ ] ReBAC 권한 시스템 구현
- [ ] Seed 데이터 생성

### Phase 3~7
- [ ] 이후 Phase 체크리스트는 각 단계에서 업데이트

---

## 💡 팁

1. **문서 읽기 순서**: 마이그레이션 계획 → Prisma 스키마 → 아키텍처 → API/백그라운드 작업
2. **병렬 개발**: 기존 Rails 앱을 유지하며 Next.js 앱 개발 가능
3. **점진적 마이그레이션**: 데이터는 Phase 6에서 일괄 마이그레이션
4. **비용 모니터링**: Supabase, Vercel, Inngest 사용량 정기 확인
5. **테스트 우선**: Phase 7에서 철저한 테스트 후 배포

---

**마지막 업데이트**: 2025-11-19
