import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

// SEO Metadata - Element 1 & 3
export const metadata: Metadata = {
  title: "Gini AI - PDF를 AI 아바타 영상으로 자동 변환 | 3분 만에 완성",
  description:
    "PDF 문서를 업로드하면 AI가 분석하고 전문 아바타가 발표하는 고품질 영상을 자동으로 제작합니다. Gemini 2.5 Pro, ElevenLabs TTS, D-ID 기술로 3분 만에 완성. 1,200개 기업이 신뢰하는 AI 영상 제작 플랫폼.",
  keywords: [
    "AI 영상 제작",
    "아바타 영상",
    "PDF 영상 변환",
    "AI 아바타",
    "자동 영상 제작",
    "TTS 영상",
    "프레젠테이션 영상",
    "교육 콘텐츠 제작",
    "마케팅 영상",
    "Gemini AI",
    "ElevenLabs",
    "D-ID",
  ],
  authors: [{ name: "Gini AI Team" }],
  creator: "Gini AI",
  publisher: "Gini AI",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://gini-ai.com",
    siteName: "Gini AI",
    title: "Gini AI - PDF를 AI 아바타 영상으로 자동 변환",
    description:
      "3분 만에 PDF를 고품질 AI 아바타 영상으로 변환하세요. 1,200개 기업이 신뢰하는 AI 영상 제작 플랫폼.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Gini AI - AI 아바타 영상 제작 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gini AI - PDF를 AI 아바타 영상으로 자동 변환",
    description:
      "3분 만에 PDF를 고품질 AI 아바타 영상으로 변환하세요. 무료 체험 가능.",
    images: ["/og-image.jpg"],
    creator: "@gini_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://gini-ai.com",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Element 2: Company Logo (in Header) */}
      <Header />

      {/* Element 3-6: Hero Section (Title, Subtitle, Primary CTA, Social Proof, Visual) */}
      <Hero />

      {/* Element 7: Core Benefits/Features */}
      <Benefits />

      {/* Element 8: Customer Testimonials */}
      <Testimonials />

      {/* Element 9: FAQ Section */}
      <FAQ />

      {/* Element 10: Final CTA */}
      <FinalCTA />

      {/* Element 11: Contact Information/Legal Pages */}
      <Footer />
    </main>
  );
}
