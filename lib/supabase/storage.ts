import "server-only";
import { createServiceClient } from "./server";

/**
 * Supabase Storage 유틸리티
 *
 * assets 버킷에 파일 업로드/삭제
 */

const ASSETS_BUCKET = "assets";

/**
 * 파일 업로드
 *
 * @param file - File 객체
 * @param path - 저장 경로 (예: "projects/abc123/avatar.png")
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true, // 같은 경로에 파일이 있으면 덮어쓰기
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * 버퍼에서 파일 업로드
 *
 * @param buffer - Buffer 데이터
 * @param path - 저장 경로
 * @param contentType - MIME 타입
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadFromBuffer(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<{ url: string; path: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(path, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    });

  if (error) {
    throw new Error(`Failed to upload buffer: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * URL에서 파일 다운로드 후 Supabase에 업로드
 *
 * @param url - 원본 파일 URL
 * @param path - 저장 경로
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadFromUrl(
  url: string,
  path: string
): Promise<{ url: string; path: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  return uploadFromBuffer(buffer, path, contentType);
}

/**
 * 파일 다운로드
 *
 * @param path - 파일 경로
 * @returns Blob
 */
export async function downloadFile(path: string): Promise<Blob> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return data;
}

/**
 * 파일 삭제
 *
 * @param path - 삭제할 파일 경로
 */
export async function deleteFile(path: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.storage.from(ASSETS_BUCKET).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * 여러 파일 삭제
 *
 * @param paths - 삭제할 파일 경로 배열
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.storage.from(ASSETS_BUCKET).remove(paths);

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}

/**
 * 공개 URL 가져오기
 *
 * @param path - 파일 경로
 * @returns 공개 URL
 */
export function getPublicUrl(path: string): string {
  const supabase = createServiceClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * 서명된 URL 생성 (임시 접근 URL)
 *
 * @param path - 파일 경로
 * @param expiresIn - 만료 시간 (초, 기본 3600 = 1시간)
 * @returns 서명된 URL
 */
export async function createSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * 프로젝트의 모든 파일 삭제
 *
 * @param projectId - 프로젝트 ID
 */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  // projects/{projectId}/ 폴더 내 모든 파일 목록 조회
  const { data: files, error: listError } = await supabase.storage
    .from(ASSETS_BUCKET)
    .list(`projects/${projectId}`, {
      limit: 1000,
    });

  if (listError) {
    throw new Error(`Failed to list project files: ${listError.message}`);
  }

  if (!files || files.length === 0) {
    return; // 삭제할 파일 없음
  }

  const paths = files.map((file) => `projects/${projectId}/${file.name}`);
  await deleteFiles(paths);
}
