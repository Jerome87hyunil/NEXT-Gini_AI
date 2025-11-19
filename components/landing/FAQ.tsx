"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "어떤 형식의 문서를 업로드할 수 있나요?",
    answer:
      "현재 PDF 형식의 문서를 지원합니다. 프레젠테이션, 보고서, 제안서, 교육 자료 등 모든 종류의 PDF를 업로드할 수 있습니다. 향후 PowerPoint, Word 등 다양한 형식을 지원할 예정입니다.",
  },
  {
    question: "영상 제작에 얼마나 시간이 걸리나요?",
    answer:
      "영상 길이에 따라 다르지만, 3분 영상 기준 평균 15분 이내에 완성됩니다. 30초 영상은 약 5분, 60초는 10분, 180초는 20분 정도 소요됩니다. TTS, 아바타, 배경을 병렬로 처리하여 시간을 최소화합니다.",
  },
  {
    question: "커스텀 아바타는 어떻게 만드나요?",
    answer:
      "프로젝트 생성 시 '커스텀 아바타' 옵션을 선택하면 성별, 나이대, 스타일, 표정, 배경을 선택할 수 있습니다. AI가 선택하신 옵션에 맞춰 독특한 아바타를 생성합니다. 프리셋 아바타도 제공되며, 생성 실패 시 자동으로 프리셋으로 전환됩니다.",
  },
  {
    question: "생성된 영상은 어디에 사용할 수 있나요?",
    answer:
      "생성된 영상은 상업적 용도로 자유롭게 사용할 수 있습니다. 마케팅 자료, 교육 콘텐츠, 제품 데모, SNS 콘텐츠, 사내 교육 등 다양한 목적으로 활용 가능합니다. 저작권은 프로젝트 생성자에게 귀속됩니다.",
  },
  {
    question: "영상 품질은 어느 정도인가요?",
    answer:
      "FullHD(1080p) 품질의 영상을 제공합니다. D-ID의 최신 립싱크 기술로 자연스러운 입 모양과 표정을 구현하며, ElevenLabs의 고품질 TTS로 전문 성우 수준의 음성을 합성합니다. Veo 3.1으로 생성된 배경 영상은 8초 길이의 고화질 영상입니다.",
  },
  {
    question: "팀원과 프로젝트를 공유할 수 있나요?",
    answer:
      "네, ReBAC(관계 기반 접근 제어) 시스템으로 팀원에게 프로젝트 권한을 부여할 수 있습니다. Owner, Editor, Viewer 역할을 설정하여 세밀한 권한 관리가 가능합니다. 조직별로 데이터가 격리되어 보안도 안전합니다.",
  },
  {
    question: "요금제는 어떻게 되나요?",
    answer:
      "무료 체험으로 시작하실 수 있으며, 프로젝트당 종량제 또는 월 구독제를 선택할 수 있습니다. 기본 비용은 프로젝트당 $2.20~$25이며, 배경 영상 품질(High/Medium/Low)에 따라 달라집니다. 대량 사용 시 엔터프라이즈 요금제를 제공합니다.",
  },
  {
    question: "다국어 음성을 지원하나요?",
    answer:
      "현재는 한국어 음성을 주로 지원하며, ElevenLabs의 multilingual 모델을 사용하여 향후 영어, 일본어, 중국어 등 다양한 언어를 지원할 예정입니다. 언어별 음성 품질은 동일하게 유지됩니다.",
  },
  {
    question: "생성된 영상을 수정할 수 있나요?",
    answer:
      "네, 씬별로 대본을 수정하고 재생성할 수 있습니다. 특정 씬만 선택하여 TTS, 아바타, 배경을 개별적으로 재생성할 수 있어 전체를 다시 만들 필요가 없습니다. 최종 합성 전까지 자유롭게 수정 가능합니다.",
  },
  {
    question: "API를 통한 자동화가 가능한가요?",
    answer:
      "REST API를 제공하여 프로젝트 생성, 문서 업로드, 렌더링 트리거, 상태 조회 등을 자동화할 수 있습니다. 웹훅을 통해 실시간 알림도 받을 수 있습니다. API 문서는 대시보드에서 확인하실 수 있습니다.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            자주 묻는 질문
          </h2>
          <p className="text-xl text-gray-600">
            궁금하신 점이 있으신가요? 여기서 답을 찾아보세요
          </p>
        </div>

        {/* FAQ Accordion - Element 9 */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-2 border-gray-200 rounded-lg px-6 hover:border-blue-200 transition-colors"
            >
              <AccordionTrigger className="text-left text-lg font-semibold text-gray-900 hover:text-blue-600 py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-lg text-gray-700 mb-4">
            더 궁금하신 사항이 있으신가요?
          </p>
          <a
            href="mailto:support@gini-ai.com"
            className="text-blue-600 hover:text-blue-700 font-semibold text-lg underline"
          >
            support@gini-ai.com
          </a>
        </div>
      </div>
    </section>
  );
}
