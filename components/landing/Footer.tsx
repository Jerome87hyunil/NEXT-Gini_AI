import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content - Element 11 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-xl font-bold text-white">Gini AI</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              PDF를 AI 아바타 영상으로 자동 변환하는 차세대 영상 제작
              플랫폼입니다.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">제품</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="hover:text-white transition">
                  주요 기능
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  요금제
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="hover:text-white transition">
                  API 문서
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-white transition">
                  업데이트 내역
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">회사</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  회사 소개
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition">
                  블로그
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-white transition">
                  채용
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  문의하기
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4">뉴스레터</h3>
            <p className="text-sm text-gray-400 mb-4">
              최신 소식과 업데이트를 받아보세요
            </p>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="이메일 주소"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-gray-800" />

      {/* Bottom Footer - Legal Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Gini AI. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              이용약관
            </Link>
            <Link href="/security" className="hover:text-white transition">
              보안
            </Link>
            <Link href="/cookies" className="hover:text-white transition">
              쿠키 정책
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
