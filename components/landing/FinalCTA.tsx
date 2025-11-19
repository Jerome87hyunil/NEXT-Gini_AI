import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="max-w-5xl mx-auto">
        {/* Element 10: Final CTA */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardContent className="p-12">
            <div className="text-center space-y-8">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>

              {/* Heading */}
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                  지금 바로 시작해보세요
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  5분 안에 첫 번째 AI 아바타 영상을 만들어보세요.
                  <br />
                  신용카드 등록 없이 무료로 체험할 수 있습니다.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link href="/auth/signin">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-lg h-14 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    무료로 시작하기
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg h-14 px-10 border-2"
                  >
                    데모 둘러보기
                  </Button>
                </Link>
              </div>

              {/* Trust Signals */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span>신용카드 불필요</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span>5분 안에 완성</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span>언제든 취소 가능</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
