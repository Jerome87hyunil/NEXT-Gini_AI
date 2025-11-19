import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  Globe,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "AI 기반 대본 생성",
    description:
      "Gemini 2.5 Pro가 PDF 문서를 분석하여 자연스러운 발표 대본을 자동 생성합니다. 핵심 내용을 놓치지 않고 전달합니다.",
  },
  {
    icon: Users,
    title: "커스텀 아바타 디자인",
    description:
      "성별, 나이대, 스타일을 선택하여 브랜드에 맞는 맞춤형 AI 아바타를 생성할 수 있습니다. 프리셋 아바타도 제공됩니다.",
  },
  {
    icon: Globe,
    title: "다국어 음성 지원",
    description:
      "ElevenLabs TTS로 자연스러운 한국어 음성을 합성합니다. 전문 성우 수준의 발음과 억양을 제공합니다.",
  },
  {
    icon: Zap,
    title: "빠른 제작 속도",
    description:
      "3분 영상 기준 평균 15분 이내 완성됩니다. 병렬 처리로 TTS, 아바타, 배경을 동시에 생성하여 시간을 절약합니다.",
  },
  {
    icon: TrendingUp,
    title: "고품질 배경 영상",
    description:
      "Google Veo 3.1으로 생성된 8초 고화질 배경 영상을 씬별로 삽입합니다. 정적인 이미지 배경도 선택 가능합니다.",
  },
  {
    icon: Shield,
    title: "기업용 보안",
    description:
      "조직별 격리된 데이터베이스, ReBAC 권한 시스템으로 안전하게 프로젝트를 관리합니다. SOC 2 준수 예정입니다.",
  },
];

export function Benefits() {
  return (
    <section
      id="features"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            왜 Gini AI를 선택해야 할까요?
          </h2>
          <p className="text-xl text-gray-600">
            전문 영상 제작팀 없이도 고품질 AI 아바타 영상을 만들 수 있습니다
          </p>
        </div>

        {/* Benefits Grid - Element 7 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="border-2 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">3분</p>
            <p className="text-gray-600">평균 제작 시간</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">98%</p>
            <p className="text-gray-600">고객 만족도</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">50K+</p>
            <p className="text-gray-600">누적 영상 제작</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 mb-2">1,200+</p>
            <p className="text-gray-600">활성 기업 고객</p>
          </div>
        </div>
      </div>
    </section>
  );
}
