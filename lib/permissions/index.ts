import "server-only";
import { prisma } from "@/lib/prisma";
import {
  NAMESPACES,
  RELATIONS,
  SUBJECT_TYPES,
  PERMISSION_HIERARCHY,
  type Namespace,
  type Relation,
  type SubjectType,
} from "./constants";

/**
 * ReBAC 권한 체크
 *
 * @param userId - 사용자 ID
 * @param namespace - 리소스 네임스페이스 (예: "project")
 * @param objectId - 리소스 ID
 * @param relation - 요구 권한 (예: "editor")
 * @returns 권한 여부
 */
export async function check(
  userId: string,
  namespace: Namespace,
  objectId: string,
  relation: Relation
): Promise<boolean> {
  if (!userId || !namespace || !objectId || !relation) {
    return false;
  }

  // 1. 직접 권한 체크
  const directPermission = await prisma.relationTuple.findFirst({
    where: {
      namespace,
      objectId,
      relation,
      subjectType: SUBJECT_TYPES.USER,
      subjectId: userId,
    },
  });

  if (directPermission) {
    return true;
  }

  // 2. 상속된 권한 체크
  const hierarchy = PERMISSION_HIERARCHY[namespace];
  if (!hierarchy) {
    return false;
  }

  // 현재 요구 권한보다 상위 권한을 가진지 체크
  for (const [higherRelation, inheritedRelations] of Object.entries(hierarchy)) {
    if (inheritedRelations.includes(relation)) {
      const inheritedPermission = await prisma.relationTuple.findFirst({
        where: {
          namespace,
          objectId,
          relation: higherRelation as Relation,
          subjectType: SUBJECT_TYPES.USER,
          subjectId: userId,
        },
      });

      if (inheritedPermission) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 권한 부여
 *
 * @param userId - 사용자 ID
 * @param namespace - 리소스 네임스페이스
 * @param objectId - 리소스 ID
 * @param relation - 부여할 권한
 */
export async function grant(
  userId: string,
  namespace: Namespace,
  objectId: string,
  relation: Relation
): Promise<void> {
  await prisma.relationTuple.upsert({
    where: {
      namespace_objectId_relation_subjectType_subjectId: {
        namespace,
        objectId,
        relation,
        subjectType: SUBJECT_TYPES.USER,
        subjectId: userId,
      },
    },
    create: {
      namespace,
      objectId,
      relation,
      subjectType: SUBJECT_TYPES.USER,
      subjectId: userId,
    },
    update: {},
  });
}

/**
 * 권한 취소
 *
 * @param userId - 사용자 ID
 * @param namespace - 리소스 네임스페이스
 * @param objectId - 리소스 ID
 * @param relation - 취소할 권한
 */
export async function revoke(
  userId: string,
  namespace: Namespace,
  objectId: string,
  relation: Relation
): Promise<void> {
  await prisma.relationTuple.deleteMany({
    where: {
      namespace,
      objectId,
      relation,
      subjectType: SUBJECT_TYPES.USER,
      subjectId: userId,
    },
  });
}

/**
 * 사용자의 특정 네임스페이스에 대한 모든 권한 조회
 *
 * @param userId - 사용자 ID
 * @param namespace - 리소스 네임스페이스
 * @returns 권한 목록
 */
export async function listUserPermissions(
  userId: string,
  namespace: Namespace
): Promise<Array<{ objectId: string; relation: Relation }>> {
  const permissions = await prisma.relationTuple.findMany({
    where: {
      namespace,
      subjectType: SUBJECT_TYPES.USER,
      subjectId: userId,
    },
    select: {
      objectId: true,
      relation: true,
    },
  });

  return permissions.map((p) => ({
    objectId: p.objectId,
    relation: p.relation as Relation,
  }));
}

/**
 * 특정 리소스에 대한 모든 권한 조회
 *
 * @param namespace - 리소스 네임스페이스
 * @param objectId - 리소스 ID
 * @returns 권한 목록 (사용자 ID와 권한)
 */
export async function listResourcePermissions(
  namespace: Namespace,
  objectId: string
): Promise<Array<{ userId: string; relation: Relation }>> {
  const permissions = await prisma.relationTuple.findMany({
    where: {
      namespace,
      objectId,
      subjectType: SUBJECT_TYPES.USER,
    },
    select: {
      subjectId: true,
      relation: true,
    },
  });

  return permissions.map((p) => ({
    userId: p.subjectId,
    relation: p.relation as Relation,
  }));
}

/**
 * 사용자가 접근 가능한 모든 리소스 ID 조회
 *
 * @param userId - 사용자 ID
 * @param namespace - 리소스 네임스페이스
 * @param minRelation - 최소 요구 권한
 * @returns 리소스 ID 목록
 */
export async function listAccessibleResources(
  userId: string,
  namespace: Namespace,
  minRelation: Relation = RELATIONS.VIEWER
): Promise<string[]> {
  const hierarchy = PERMISSION_HIERARCHY[namespace];
  const allowedRelations: Relation[] = [minRelation];

  // 상위 권한 포함
  for (const [relation, inheritedRelations] of Object.entries(hierarchy)) {
    if (inheritedRelations.includes(minRelation)) {
      allowedRelations.push(relation as Relation);
    }
  }

  const permissions = await prisma.relationTuple.findMany({
    where: {
      namespace,
      subjectType: SUBJECT_TYPES.USER,
      subjectId: userId,
      relation: {
        in: allowedRelations,
      },
    },
    select: {
      objectId: true,
    },
    distinct: ["objectId"],
  });

  return permissions.map((p) => p.objectId);
}

// 상수 및 타입 재export
export { NAMESPACES, RELATIONS, SUBJECT_TYPES, PERMISSION_HIERARCHY };
export type { Namespace, Relation, SubjectType };
