"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Shield } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    projectId: string;
    projectTitle: string;
    relation: string;
  }[];
}

interface Project {
  id: string;
  title: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  permissions: {
    userId: string;
    userName: string;
    userEmail: string;
    relation: string;
  }[];
}

interface PermissionManagerProps {
  users: User[];
  projects: Project[];
}

export function PermissionManager({ users, projects }: PermissionManagerProps) {
  const [selectedView, setSelectedView] = useState<"by-user" | "by-project">("by-user");
  const [isLoading, setIsLoading] = useState(false);

  const relationColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800 border-purple-300",
    editor: "bg-blue-100 text-blue-800 border-blue-300",
    viewer: "bg-green-100 text-green-800 border-green-300",
  };

  const handleGrantPermission = async (
    userId: string,
    projectId: string,
    relation: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/permissions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId, relation }),
      });

      if (!response.ok) throw new Error("권한 부여 실패");

      // 페이지 새로고침
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("권한 부여에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokePermission = async (
    userId: string,
    projectId: string,
    relation: string
  ) => {
    if (!confirm("정말 이 권한을 해제하시겠습니까?")) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/permissions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId, relation }),
      });

      if (!response.ok) throw new Error("권한 해제 실패");

      // 페이지 새로고침
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("권한 해제에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>권한 관리</CardTitle>
            <CardDescription>사용자 및 프로젝트별 권한 설정</CardDescription>
          </div>
          <Select
            value={selectedView}
            onValueChange={(value) => setSelectedView(value as "by-user" | "by-project")}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="by-user">사용자별 보기</SelectItem>
              <SelectItem value="by-project">프로젝트별 보기</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {selectedView === "by-user" ? (
          <div className="space-y-6">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {user.role === "admin" ? "관리자" : "멤버"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.permissions.length}개 권한
                  </div>
                </div>

                {/* 사용자의 프로젝트 권한 목록 */}
                <div className="space-y-2">
                  {user.permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      부여된 권한이 없습니다
                    </p>
                  ) : (
                    user.permissions.map((perm) => (
                      <div
                        key={`${perm.projectId}-${perm.relation}`}
                        className="flex items-center justify-between bg-secondary/50 rounded-md p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{perm.projectTitle}</div>
                            <div className="text-xs text-muted-foreground">
                              프로젝트 ID: {perm.projectId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={relationColors[perm.relation] || ""}
                          >
                            {perm.relation}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRevokePermission(user.id, perm.projectId, perm.relation)
                            }
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 권한 추가 폼 */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(projectId) => {
                        const relation = "viewer"; // 기본값
                        handleGrantPermission(user.id, projectId, relation);
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="프로젝트 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects
                          .filter(
                            (p) =>
                              !user.permissions.some((perm) => perm.projectId === p.id)
                          )
                          .map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{project.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      생성자: {project.createdBy.name || project.createdBy.email}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.permissions.length}명 접근 가능
                  </div>
                </div>

                {/* 프로젝트의 사용자 권한 목록 */}
                <div className="space-y-2">
                  {project.permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      권한이 부여된 사용자가 없습니다
                    </p>
                  ) : (
                    project.permissions.map((perm) => (
                      <div
                        key={`${perm.userId}-${perm.relation}`}
                        className="flex items-center justify-between bg-secondary/50 rounded-md p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{perm.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {perm.userEmail}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={relationColors[perm.relation] || ""}
                          >
                            {perm.relation}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRevokePermission(perm.userId, project.id, perm.relation)
                            }
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 사용자 추가 폼 */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(userId) => {
                        const relation = "viewer"; // 기본값
                        handleGrantPermission(userId, project.id, relation);
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="사용자 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(
                            (u) =>
                              !project.permissions.some((perm) => perm.userId === u.id)
                          )
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
