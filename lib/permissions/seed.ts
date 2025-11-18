import { prisma } from "@/lib/prisma";
import { NAMESPACES, RELATIONS } from "./constants";

/**
 * ReBAC 권한 정의 Seed
 *
 * 권한 상속 규칙을 데이터베이스에 저장
 */
export async function seedPermissionDefinitions() {
  console.log("🌱 Seeding permission definitions...");

  // Project 권한 정의
  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.PROJECT,
        relation: RELATIONS.OWNER,
      },
    },
    create: {
      namespace: NAMESPACES.PROJECT,
      relation: RELATIONS.OWNER,
      inherits: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    },
    update: {
      inherits: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    },
  });

  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.PROJECT,
        relation: RELATIONS.EDITOR,
      },
    },
    create: {
      namespace: NAMESPACES.PROJECT,
      relation: RELATIONS.EDITOR,
      inherits: [RELATIONS.VIEWER],
    },
    update: {
      inherits: [RELATIONS.VIEWER],
    },
  });

  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.PROJECT,
        relation: RELATIONS.VIEWER,
      },
    },
    create: {
      namespace: NAMESPACES.PROJECT,
      relation: RELATIONS.VIEWER,
      inherits: [],
    },
    update: {
      inherits: [],
    },
  });

  // Organization 권한 정의
  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.ORGANIZATION,
        relation: RELATIONS.OWNER,
      },
    },
    create: {
      namespace: NAMESPACES.ORGANIZATION,
      relation: RELATIONS.OWNER,
      inherits: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    },
    update: {
      inherits: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    },
  });

  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.ORGANIZATION,
        relation: RELATIONS.EDITOR,
      },
    },
    create: {
      namespace: NAMESPACES.ORGANIZATION,
      relation: RELATIONS.EDITOR,
      inherits: [RELATIONS.VIEWER],
    },
    update: {
      inherits: [RELATIONS.VIEWER],
    },
  });

  await prisma.relationDefinition.upsert({
    where: {
      namespace_relation: {
        namespace: NAMESPACES.ORGANIZATION,
        relation: RELATIONS.VIEWER,
      },
    },
    create: {
      namespace: NAMESPACES.ORGANIZATION,
      relation: RELATIONS.VIEWER,
      inherits: [],
    },
    update: {
      inherits: [],
    },
  });

  console.log("✅ Permission definitions seeded successfully");
}
