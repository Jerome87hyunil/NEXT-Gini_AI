"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Element 2 */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Gini AI</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-600 hover:text-gray-900 transition"
            >
              기능
            </Link>
            <Link
              href="#testimonials"
              className="text-gray-600 hover:text-gray-900 transition"
            >
              후기
            </Link>
            <Link
              href="#faq"
              className="text-gray-600 hover:text-gray-900 transition"
            >
              FAQ
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin">
              <Button variant="ghost" className="hidden sm:inline-flex">
                로그인
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button>무료 시작하기</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
