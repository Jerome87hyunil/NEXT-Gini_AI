import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "김민준",
    role: "마케팅 팀장",
    company: "테크스타트업",
    avatar: "김",
    rating: 5,
    content:
      "매주 제품 업데이트 영상을 만들어야 하는데, Gini AI 덕분에 제작 시간이 90% 단축됐습니다. 이제 PDF만 업로드하면 바로 완성됩니다!",
  },
  {
    name: "이서연",
    role: "교육 콘텐츠 디렉터",
    company: "에듀테크",
    avatar: "이",
    rating: 5,
    content:
      "온라인 강의 자료를 영상으로 변환하는데 최적입니다. 커스텀 아바타로 브랜드 일관성도 유지하고, 학생들 반응도 아주 좋아요.",
  },
  {
    name: "박준호",
    role: "HR 매니저",
    company: "글로벌 기업",
    avatar: "박",
    rating: 5,
    content:
      "신입사원 교육 영상 제작이 너무 간편해졌어요. 다양한 부서의 교육 자료를 빠르게 영상화할 수 있어서 온보딩 프로세스가 크게 개선됐습니다.",
  },
  {
    name: "최지우",
    role: "세일즈 디렉터",
    company: "SaaS 스타트업",
    avatar: "최",
    rating: 5,
    content:
      "제품 데모 영상을 고객사별로 맞춤 제작할 수 있어서 전환율이 2배 증가했습니다. 비용 대비 효과가 정말 탁월해요!",
  },
  {
    name: "정수민",
    role: "콘텐츠 크리에이터",
    company: "미디어 에이전시",
    avatar: "정",
    rating: 5,
    content:
      "클라이언트 프로젝트마다 프레젠테이션 영상을 만드는데, 품질도 좋고 제작 속도도 빨라서 업무 효율이 크게 올랐습니다.",
  },
  {
    name: "강태현",
    role: "CEO",
    company: "핀테크 스타트업",
    avatar: "강",
    rating: 5,
    content:
      "투자 IR 자료를 영상으로 만들어 배포하니 투자자들의 이해도가 높아졌습니다. 전문 제작사 없이도 퀄리티 있는 영상을 만들 수 있어요.",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            고객들이 말하는 Gini AI
          </h2>
          <p className="text-xl text-gray-600">
            1,200개 이상의 기업이 신뢰하는 AI 영상 제작 플랫폼
          </p>
        </div>

        {/* Testimonials Grid - Element 8 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="border-2 hover:border-blue-200 hover:shadow-xl transition-all duration-300 bg-white"
            >
              <CardContent className="pt-6 space-y-4">
                {/* Rating */}
                <div className="flex items-center space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-blue-100" />
                  <p className="text-gray-700 leading-relaxed relative z-10 pl-6">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                  <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600">
                    <AvatarFallback className="text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} · {testimonial.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 pt-16 border-t border-gray-200">
          <p className="text-center text-gray-600 mb-8">신뢰받는 파트너</p>
          <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-60">
            {[
              "Google Cloud",
              "ElevenLabs",
              "D-ID",
              "Supabase",
              "Vercel",
            ].map((partner) => (
              <div key={partner} className="text-xl font-bold text-gray-700">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
