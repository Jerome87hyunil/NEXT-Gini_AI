import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ id: string }>;

export default async function ProjectDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // 프로젝트 데이터는 클라이언트에서 fetch
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                프로젝트 상세
              </h1>
              <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              렌더링 시작
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                기본 정보
              </h2>
              <p className="text-gray-600">
                (클라이언트 컴포넌트로 구현 필요)
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                문서
              </h2>
              <p className="text-gray-600">업로드된 문서 목록</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                씬
              </h2>
              <p className="text-gray-600">생성된 씬 목록</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
