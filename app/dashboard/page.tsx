import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // 프로젝트 목록은 클라이언트에서 fetch
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Gini AI Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {session.user.email}
              </span>
              <Link
                href="/auth/signout"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              프로젝트
            </h2>
            <Link
              href="/dashboard/projects/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 새 프로젝트
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600">
              프로젝트 목록을 불러오는 중...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              (클라이언트 컴포넌트로 구현 필요)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
