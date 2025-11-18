import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            새 프로젝트 만들기
          </h1>

          <form className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                프로젝트 제목
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 2024년 사업 계획 발표"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                설명 (선택)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="프로젝트에 대한 간단한 설명"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아바타 모드
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="avatarMode"
                    value="preset"
                    defaultChecked
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    프리셋 아바타 사용
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="avatarMode"
                    value="custom"
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    커스텀 아바타 생성 (추가 비용 발생)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                프로젝트 생성
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
