# Gini AI - Next.js 마이그레이션 계획

> Rails 8 → Next.js + FDP 백엔드 아키텍처 마이그레이션 종합 계획

## 목차
1. [개요](#개요)
2. [마이그레이션 전략](#마이그레이션-전략)
3. [기술 스택 비교](#기술-스택-비교)
4. [단계별 일정](#단계별-일정)
5. [리스크 및 대응 전략](#리스크-및-대응-전략)
6. [비용 분석](#비용-분석)
7. [성공 기준](#성공-기준)

---

## 개요

### 마이그레이션 목표

Rails 8 기반 Gini AI 프로젝트를 **Next.js + FDP (Flowcoder Development Process) 백엔드 아키텍처**로 마이그레이션하여:

- ✅ **확장성**: Vercel 서버리스 환경에서 자동 스케일링
- ✅ **성능**: React Server Components로 초기 로딩 속도 개선
- ✅ **개발 생산성**: TypeScript 타입 안정성, Prisma ORM
- ✅ **비용 최적화**: 무료 티어 활용 (Vercel, Supabase, Inngest)
- ✅ **현대화**: Next.js 에코시스템 및 최신 도구 활용

### 현재 상태 (Rails 8)

- **프레임워크**: Rails 8.0.2.1, Ruby 3.4.7
- **데이터베이스**: SQLite3 (WAL 모드)
- **백그라운드 작업**: Solid Queue (12개 Job)
- **실시간 통신**: Action Cable
- **파일 저장**: Active Storage (로컬/S3)
- **프론트엔드**: Hotwire (Turbo + Stimulus), Tailwind CSS

### 목표 상태 (Next.js)

- **프레임워크**: Next.js 15 (App Router), React 19
- **데이터베이스**: Supabase PostgreSQL
- **ORM**: Prisma
- **인증**: NextAuth.js (OAuth: Google, GitHub)
- **권한**: ReBAC (Relationship-Based Access Control)
- **백그라운드 작업**: Inngest
- **FFmpeg 처리**: AWS Lambda + FFmpeg Layer
- **실시간 통신**: Supabase Realtime
- **파일 저장**: Supabase Storage
- **배포**: Vercel

---

## 마이그레이션 전략

### 접근법: Greenfield (새로 구축)

**선택 이유**:
1. Rails와 Next.js는 아키텍처가 근본적으로 다름
2. 데이터 구조는 유사하므로 마이그레이션 스크립트로 전환 가능
3. 새 기능 추가 및 개선 기회
4. 기존 Rails 앱을 유지하며 병렬 개발 가능

### 대안 (검토 후 기각)

| 접근법 | 장점 | 단점 | 결정 |
|--------|------|------|------|
| Big Bang | 빠른 전환 | 리스크 높음, 롤백 어려움 | ❌ 기각 |
| Strangler Fig | 점진적 전환, 낮은 리스크 | 복잡한 설정, 오랜 기간 | ❌ 기각 |
| **Greenfield** | **새 기능 추가 용이, 깨끗한 아키텍처** | **초기 개발 비용** | ✅ **선택** |

---

## 기술 스택 비교

### 데이터베이스

| 구성 요소 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| DB | SQLite3 | PostgreSQL (Supabase) | 확장성, Realtime, FDP 표준 |
| ORM | Active Record | Prisma | TypeScript 타입 안정성 |
| 마이그레이션 | Rails migrations | Prisma migrations | 자동 타입 생성 |

### 인증 및 권한

| 구성 요소 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| 인증 | 커스텀/Devise | NextAuth.js | OAuth 간편 연동 |
| 권한 | Role-based (Admin/Editor) | ReBAC | 유연성, 확장성 |
| 세션 | 쿠키 기반 | DB 세션 (Prisma) | 보안, 멀티 디바이스 |

### 백그라운드 작업

| 구성 요소 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| 큐 시스템 | Solid Queue (SQLite) | Inngest | Vercel 친화적 |
| 실행 시간 | 무제한 | 최대 1시간 (Inngest) | 충분한 시간 |
| 재시도 | 수동 구현 | 자동 재시도 | 안정성 |
| 폴링 | 수동 구현 | `step.run()` 재시도 | 간편함 |

### 파일 저장

| 파일 타입 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| 모든 파일 | Active Storage | Supabase Storage (무료 1GB, Pro 100GB) | PostgreSQL 통합, CDN 내장 |
| 대용량 (선택) | S3 | Supabase Storage 또는 S3/R2 | 필요시만 추가 |
| CDN | CloudFront (선택) | Supabase CDN | 무료 제공 |

### 실시간 통신

| 구성 요소 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| 프로토콜 | WebSocket (Action Cable) | WebSocket (Supabase Realtime) | PostgreSQL 통합 |
| 브로드캐스트 | Redis (선택) | Supabase 내장 | 인프라 간소화 |
| 확장성 | Redis 클러스터 | Supabase 관리 | 운영 부담 감소 |

### FFmpeg 비디오 합성

| 구성 요소 | Rails | Next.js | 변경 이유 |
|-----------|-------|---------|-----------|
| 실행 환경 | Rails 서버 | AWS Lambda | Vercel 제한 회피 |
| 실행 시간 | 무제한 | 15분 (Lambda) | 충분한 시간 |
| 메모리 | 서버 메모리 | 최대 10GB | 대용량 처리 |
| 비용 | 서버 유지 비용 | 사용량 기반 | 비용 효율 |

---

## 단계별 일정

### Phase 1: 인프라 설정 (1주)

**목표**: 모든 외부 서비스 계정 생성 및 초기 설정

**작업**:
- [ ] Supabase 프로젝트 생성
  - PostgreSQL 데이터베이스
  - Storage 버킷 (assets)
  - Realtime 설정
- [ ] Vercel 프로젝트 생성
  - Next.js 프로젝트 연결
  - 환경 변수 설정
- [ ] Inngest 계정 설정
  - Dev Server 설정
  - 이벤트 키 생성
- [ ] AWS 설정
  - Lambda 함수 생성 (FFmpeg Layer)
  - (선택) S3 버킷 생성 - 대용량 파일용 (Supabase Storage로 충분하면 생략)
- [ ] OAuth 앱 생성
  - Google OAuth 클라이언트
  - GitHub OAuth 앱

**산출물**:
- `.env.local` 템플릿
- 인프라 설정 문서

---

### Phase 2: 데이터베이스 및 인증 (1주)

**목표**: Prisma 스키마 및 NextAuth 설정 완료

**작업**:
- [ ] Prisma 스키마 작성 (11개 테이블)
  - 기존 7개 모델 (Organization, User, Project, Document, Scene, Asset, RenderJob)
  - NextAuth 2개 (Account, Session)
  - ReBAC 2개 (RelationTuple, RelationDefinition)
- [ ] Prisma 마이그레이션 실행
- [ ] NextAuth.js 설정
  - Google, GitHub OAuth 연동
  - 세션 관리 (DB 전략)
- [ ] ReBAC 권한 시스템 구현
  - `lib/permissions.ts` (check, grant, revoke)
  - RelationDefinition 시드 데이터
- [ ] Seed 데이터 생성
  - 테스트 조직, 사용자, 프로젝트

**산출물**:
- `prisma/schema.prisma`
- `lib/permissions.ts`
- `app/api/auth/[...nextauth]/route.ts`

---

### Phase 3: API 및 서비스 레이어 (2주)

**목표**: 모든 API Routes 및 외부 서비스 클라이언트 구현

**작업**:
- [ ] API Routes 구현
  - `app/api/projects/*` (CRUD, 권한 체크)
  - `app/api/documents/*` (업로드, 삭제)
  - `app/api/scenes/*` (CRUD)
  - `app/api/webhooks/did/route.ts` (D-ID 웹훅)
- [ ] 외부 서비스 클라이언트
  - `lib/services/google-gemini.ts` (Gemini, Nano Banana, Veo 3.1)
  - `lib/services/elevenlabs.ts` (TTS)
  - `lib/services/did.ts` (D-ID 아바타)
- [ ] 파일 업로드/다운로드
  - Supabase Storage 연동
  - 파일 검증 (MIME, 크기)
- [ ] 권한 체크 미들웨어
  - API Routes에서 ReBAC 권한 확인

**산출물**:
- `app/api/**/*.ts` (API Routes)
- `lib/services/*.ts` (서비스 클라이언트)

---

### Phase 4: 백그라운드 작업 (2주)

**목표**: Inngest 함수 및 AWS Lambda FFmpeg 구현

**작업**:
- [ ] Inngest 함수 구현 (12개)
  1. `document-parser.ts` - PDF 검증
  2. `script-generator.ts` - 대본 생성
  3. `avatar-design-generator.ts` - 커스텀 아바타
  4. `scene-processor.ts` - 씬 순차 처리 오케스트레이터
  5. `tts-generator.ts` - TTS 생성
  6. `avatar-generator.ts` - D-ID 아바타 생성
  7. `avatar-poller.ts` - D-ID 폴링 (5초, 20회)
  8. `background-generator.ts` - 배경 생성
  9. `veo-generator.ts` - Veo 영상 생성
  10. `veo-poller.ts` - Veo 폴링 (5초, 120회)
  11. `video-compositor.ts` - 비디오 합성 트리거
  12. `video-render.ts` - AWS Lambda 호출
- [ ] AWS Lambda FFmpeg 함수
  - FFmpeg Layer 설정
  - S3/Supabase Storage 연동
  - 진행률 콜백 API
- [ ] 에러 처리 및 재시도
  - Inngest 자동 재시도 설정
  - 실패 알림 (선택)

**산출물**:
- `inngest/functions/*.ts` (12개 함수)
- AWS Lambda 함수 (ffmpeg-video-compositor)

---

### Phase 5: 프론트엔드 (2주)

**목표**: 모든 페이지 및 컴포넌트 구현

**작업**:
- [ ] 레이아웃 및 네비게이션
  - `app/(dashboard)/layout.tsx`
  - 사이드바, 헤더
- [ ] 인증 페이지
  - `app/login/page.tsx` (OAuth 로그인)
  - 로그인 상태 확인
- [ ] 프로젝트 페이지
  - `app/(dashboard)/projects/page.tsx` (목록)
  - `app/(dashboard)/projects/new/page.tsx` (생성)
  - `app/(dashboard)/projects/[id]/page.tsx` (상세)
- [ ] 씬 편집기
  - `components/SceneEditor.tsx`
  - 대본 편집, 삭제
- [ ] 실시간 진행률 표시
  - `components/DocumentStatus.tsx` (Supabase Realtime)
  - `components/RenderProgress.tsx`
- [ ] 비디오 플레이어
  - `components/VideoPlayer.tsx`
  - 재생, 일시정지, 속도 조절
- [ ] UI 컴포넌트 (shadcn/ui)
  - Button, Input, Select, Progress
  - Dialog, Dropdown, Toast

**산출물**:
- `app/(dashboard)/**/*.tsx` (페이지)
- `components/*.tsx` (컴포넌트)

---

### Phase 6: 데이터 마이그레이션 (1주)

**목표**: Rails SQLite → Next.js PostgreSQL 데이터 전환

**작업**:
- [ ] 마이그레이션 스크립트 작성
  - `scripts/migrate-data.ts`
  - SQLite → PostgreSQL 변환
- [ ] 데이터 마이그레이션 실행
  - Organization, User
  - Project (+ ReBAC 권한 부여)
  - Document, Scene, Asset
  - RenderJob
- [ ] 파일 마이그레이션
  - Active Storage → Supabase Storage
  - 로컬 파일 → S3/R2
- [ ] 데이터 검증
  - 레코드 수 확인
  - 관계 무결성 확인
  - 파일 접근성 확인

**산출물**:
- `scripts/migrate-data.ts`
- 마이그레이션 로그

---

### Phase 7: 테스트 및 배포 (1주)

**목표**: 테스트 완료 및 프로덕션 배포

**작업**:
- [ ] Unit 테스트 (Vitest)
  - `lib/permissions.test.ts` (ReBAC)
  - `lib/services/*.test.ts` (API 클라이언트)
- [ ] Integration 테스트
  - `tests/api/*.test.ts` (API Routes)
  - `tests/inngest/*.test.ts` (Inngest 함수)
- [ ] E2E 테스트 (Playwright)
  - 프로젝트 생성 플로우
  - 문서 업로드 플로우
  - 영상 렌더링 플로우
- [ ] 성능 테스트
  - 동시 처리 10+ 프로젝트
  - API 응답 시간 < 500ms
- [ ] Staging 배포
  - Vercel Preview 배포
  - Inngest Dev 환경 테스트
- [ ] Production 배포
  - Vercel Production 배포
  - 환경 변수 설정
  - DNS 설정

**산출물**:
- 테스트 커버리지 리포트
- 배포 체크리스트

---

## 리스크 및 대응 전략

### 1. FFmpeg 처리 복잡도

**리스크**: Vercel 서버리스에서 FFmpeg 실행 불가

**대응**:
- AWS Lambda + FFmpeg Layer 사용
- 최대 15분 실행 시간, 10GB 메모리
- S3/Supabase Storage 연동

**백업 계획**: Railway 또는 Render에 전용 FFmpeg 워커 서버 배포

---

### 2. Vercel 실행 시간 제한

**리스크**: Vercel Pro (60초), Enterprise (300초) 제한

**대응**:
- Inngest 사용 (최대 1시간 실행)
- 긴 작업은 Inngest 함수로 분리
- AWS Lambda로 오프로드

**백업 계획**: Vercel Enterprise ($500/월) 또는 Railway 병행 사용

---

### 3. 대용량 파일 처리

**리스크**: Supabase Free (1GB 총 용량), Pro (100GB)

**대응**:
- **우선 전략**: Supabase Storage 사용 (1GB면 충분)
  - PDF: 5-10MB/개
  - 오디오: 3-5MB/개
  - 이미지: 2-5MB/개
  - 영상: 10-50MB/개
  - 총 100개 프로젝트 ≈ 500MB-1GB
- **필요시**: Supabase Pro ($25/월, 100GB) 또는 S3/R2 추가

**백업 계획**: Cloudflare R2 (무료 egress, S3 호환)

---

### 4. 폴링 오버헤드

**리스크**: D-ID, Veo 폴링으로 인한 비용 증가

**대응**:
- Inngest `step.run()` 재시도 활용 (자동)
- 폴링 간격 최적화 (5초)
- 최대 시도 횟수 제한 (D-ID: 20회, Veo: 120회)

**백업 계획**: 웹훅으로 전환 (D-ID 지원, Veo는 미지원)

---

### 5. 비용 증가

**리스크**: 인프라 비용 상승

**대응**:
- Free 티어 최대 활용
  - Vercel Free (개발), Pro (프로덕션)
  - Supabase Free (1GB Storage)
  - Inngest Free (250K steps/월)
- 배경 생성 우선순위 최적화 (High만 Veo)
- 사용량 모니터링

**백업 계획**: Railway ($5/월부터) 또는 Render로 일부 워커 이관

---

## 비용 분석

### 월 100개 프로젝트 기준

#### 외부 API 비용 (변동 없음)

| 항목 | 단가 | 수량 | 월 비용 |
|------|------|------|---------|
| Gemini 2.5 Pro | $0.50/프로젝트 | 100 | $50 |
| Nano Banana | $0.039/이미지 | 400 (배경 4개/프로젝트) | $16 |
| Veo 3.1 | $1.50/영상 | 200 (High만) | $300 |
| ElevenLabs | $0.20/프로젝트 | 100 | $20 |
| D-ID | $1.50/프로젝트 | 100 | $150 |
| **API 총 비용** | - | - | **$536** |

#### 인프라 비용 (Rails vs Next.js)

| 항목 | Rails | Next.js | 차이 |
|------|-------|---------|------|
| 서버/호스팅 | $50/월 (Heroku/Fly.io) | $20/월 (Vercel Pro) | **-$30** |
| 데이터베이스 | $0 (SQLite) | $0 (Supabase Free 1GB) | $0 |
| Queue | $0 (Solid Queue) | $0 (Inngest Free) | $0 |
| Storage | $10/월 (S3) | $0 (Supabase Free 1GB) | **-$10** |
| FFmpeg | $0 (서버 내장) | $10/월 (AWS Lambda) | **+$10** |
| CDN | $0 (선택) | $0 (Supabase 내장) | $0 |
| **인프라 총 비용** | **$60** | **$30** | **-$30** |

#### 총 비용

| 구분 | Rails | Next.js | 차이 |
|------|-------|---------|------|
| API 비용 | $536 | $536 | $0 |
| 인프라 비용 | $60 | $30 | **-$30** |
| **총 비용** | **$596** | **$566** | **-$30 (5% 절감)** |

**결론**: Next.js 마이그레이션으로 월 $30 절감 (Supabase Storage 무료 활용) + 확장성 및 성능 개선

---

## 성공 기준

### 기능 요구사항

- [x] ✅ 모든 기존 기능 동작 (PDF 업로드, 대본 생성, 영상 렌더링)
- [x] ✅ OAuth 로그인 (Google, GitHub)
- [x] ✅ 프로젝트 권한 관리 (owner/editor/viewer)
- [x] ✅ 실시간 진행률 표시
- [x] ✅ 커스텀 아바타 생성
- [x] ✅ 배경 생성 (Veo, Nano, Gradient)

### 성능 요구사항

- **영상 생성 시간**: 3분 영상 P95 ≤ 15분
- **API 응답 시간**: P95 ≤ 500ms
- **동시 처리**: 10+ 프로젝트 동시 렌더링
- **가용성**: > 99.9% (Vercel SLA)

### 비용 요구사항

- **총 비용**: Rails 대비 120% 이하
- **API 비용**: 변동 없음
- **인프라 비용**: $50/월 이하 (100 프로젝트 기준)

### 품질 요구사항

- **테스트 커버리지**: > 80%
- **TypeScript 엄격 모드**: 활성화
- **Lighthouse 점수**: Performance > 90
- **보안**: OWASP Top 10 준수

---

## 다음 단계

1. **Phase 1 시작**: 인프라 설정 (Supabase, Vercel, Inngest)
2. **Prisma 스키마 작성**: [NEXTJS_PRISMA_SCHEMA.md](./NEXTJS_PRISMA_SCHEMA.md) 참조
3. **아키텍처 상세 검토**: [NEXTJS_ARCHITECTURE.md](./NEXTJS_ARCHITECTURE.md) 참조
4. **API 설계 검토**: [NEXTJS_API_DESIGN.md](./NEXTJS_API_DESIGN.md) 참조
5. **Inngest 함수 설계**: [NEXTJS_BACKGROUND_JOBS.md](./NEXTJS_BACKGROUND_JOBS.md) 참조

---

## 참고 문서

- [FDP 백엔드 아키텍처 스킬](../../.claude/skills/fdp-backend-architect/)
- [현재 아키텍처](./ARCHITECTURE.md)
- [현재 워크플로우](./WORKFLOW.md)
- [데이터베이스 스키마](./DATABASE_SCHEMA.md)
