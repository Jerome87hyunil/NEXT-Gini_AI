"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              ✨ AI 기반 영상 제작 플랫폼
            </Badge>

            {/* Title - Element 3 */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                PDF를 업로드하면
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  AI 아바타 영상
                </span>
                이 완성됩니다
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                문서를 AI가 분석하고, 전문 아바타가 발표하는 고품질 영상을
                자동으로 제작합니다. 복잡한 편집 없이 3분이면 완성됩니다.
              </p>
            </div>

            {/* Primary CTA - Element 4 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signin">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg h-14 px-8"
              >
                <Play className="mr-2 h-5 w-5" />
                데모 보기
              </Button>
            </div>

            {/* Social Proof - Element 5 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  4.9/5.0
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300 hidden sm:block" />
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  <strong className="font-semibold text-gray-900">
                    1,200+
                  </strong>{" "}
                  기업이 사용 중
                </span>
              </div>
            </div>
          </div>

          {/* Right: Visual - Element 6 */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center space-y-4">
                  <Play className="h-20 w-20 mx-auto opacity-80" />
                  <p className="text-lg font-medium">영상 데모 준비 중</p>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">평균 제작 시간</p>
                  <p className="text-xl font-bold text-gray-900">3분</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">누적 영상 제작</p>
                  <p className="text-xl font-bold text-gray-900">50,000+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
