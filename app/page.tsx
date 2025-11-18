export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Gini AI - Next.js 마이그레이션
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Rails 8에서 Next.js 15 + FDP 백엔드 아키텍처로 마이그레이션 진행 중
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            프로젝트 개요
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Next.js 15 App Router</li>
            <li>✅ TypeScript + Tailwind CSS</li>
            <li>⏳ Prisma + Supabase PostgreSQL</li>
            <li>⏳ NextAuth.js + ReBAC</li>
            <li>⏳ Inngest Background Jobs</li>
            <li>⏳ API Routes 구현</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
