/**
 * Supabase Storage 버킷 초기화 스크립트
 *
 * 실행 방법:
 * npm run storage:setup
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// .env.local 파일 로드
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorage() {
  console.log("🚀 Supabase Storage 버킷 초기화 시작...\n");

  try {
    // 1. 기존 버킷 확인
    console.log("1️⃣  기존 버킷 확인 중...");
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`버킷 목록 조회 실패: ${listError.message}`);
    }

    const assetsExists = existingBuckets?.some((bucket) => bucket.id === "assets");

    if (assetsExists) {
      console.log("   ✅ 'assets' 버킷이 이미 존재합니다.");
      console.log("   ℹ️  기존 버킷을 사용합니다.\n");
      return;
    }

    // 2. assets 버킷 생성
    console.log("2️⃣  'assets' 버킷 생성 중...");
    const { data: bucket, error: createError } = await supabase.storage.createBucket("assets", {
      public: true, // 공개 버킷 (public URL 사용 가능)
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "audio/mpeg",
        "audio/wav",
        "video/mp4",
        "video/webm",
      ],
    });

    if (createError) {
      throw new Error(`버킷 생성 실패: ${createError.message}`);
    }

    console.log("   ✅ 'assets' 버킷 생성 완료");
    console.log(`   📦 버킷 ID: ${bucket.name}`);
    console.log("   🌐 공개 버킷: 예");
    console.log("   📏 파일 크기 제한: 10MB\n");

    // 3. SQL 파일 실행 (정책 생성)
    console.log("3️⃣  Storage 정책 생성 중...");
    const sqlPath = path.join(__dirname, "../prisma/migrations/storage_setup.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // SQL 파일에서 정책 생성 부분만 추출
    const policyStatements = sqlContent
      .split(";")
      .filter((stmt) => stmt.trim().startsWith("CREATE POLICY"))
      .map((stmt) => stmt.trim() + ";");

    for (const statement of policyStatements) {
      const { error: policyError } = await supabase.rpc("exec_sql", {
        sql: statement,
      });

      if (policyError) {
        console.warn(`   ⚠️  정책 생성 경고: ${policyError.message}`);
        console.warn("   ℹ️  Supabase Dashboard에서 수동으로 정책을 생성해야 할 수 있습니다.\n");
      }
    }

    console.log("   ✅ Storage 정책 설정 완료\n");

    // 4. 검증
    console.log("4️⃣  설정 검증 중...");
    const { data: buckets } = await supabase.storage.listBuckets();
    const assetsBucket = buckets?.find((b) => b.id === "assets");

    if (assetsBucket) {
      console.log("   ✅ 'assets' 버킷 확인됨");
      console.log("   📋 버킷 정보:");
      console.log(`      - ID: ${assetsBucket.id}`);
      console.log(`      - 이름: ${assetsBucket.name}`);
      console.log(`      - 공개: ${assetsBucket.public ? "예" : "아니오"}`);
      console.log(`      - 생성일: ${assetsBucket.created_at}\n`);
    }

    console.log("✅ Supabase Storage 버킷 초기화 완료!");
    console.log("\n📝 다음 단계:");
    console.log("   1. 문서 업로드 테스트: http://localhost:3001/dashboard/projects");
    console.log("   2. Supabase Dashboard에서 버킷 확인: https://supabase.com/dashboard\n");
  } catch (error) {
    console.error("\n❌ 에러 발생:", error);
    console.error("\n🔧 수동 설정이 필요합니다:");
    console.error("   1. Supabase Dashboard > Storage 접속");
    console.error("   2. 'Create a new bucket' 클릭");
    console.error("   3. 버킷 이름: 'assets'");
    console.error("   4. Public bucket: 체크");
    console.error("   5. File size limit: 10 MB");
    console.error("   6. Save 클릭\n");
    console.error("   또는 prisma/migrations/storage_setup.sql 파일을");
    console.error("   Supabase Dashboard > SQL Editor에서 직접 실행\n");
    process.exit(1);
  }
}

// 스크립트 실행
setupStorage();
