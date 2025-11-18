// ReBAC 권한 시스템 상수 및 타입

export const NAMESPACES = {
  PROJECT: "project",
  ORGANIZATION: "organization",
} as const;

export const RELATIONS = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export const SUBJECT_TYPES = {
  USER: "user",
} as const;

export type Namespace = typeof NAMESPACES[keyof typeof NAMESPACES];
export type Relation = typeof RELATIONS[keyof typeof RELATIONS];
export type SubjectType = typeof SUBJECT_TYPES[keyof typeof SUBJECT_TYPES];

// 권한 상속 정의
export const PERMISSION_HIERARCHY: Record<
  Namespace,
  Record<Relation, Relation[]>
> = {
  [NAMESPACES.PROJECT]: {
    [RELATIONS.OWNER]: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    [RELATIONS.EDITOR]: [RELATIONS.VIEWER],
    [RELATIONS.VIEWER]: [],
  },
  [NAMESPACES.ORGANIZATION]: {
    [RELATIONS.OWNER]: [RELATIONS.EDITOR, RELATIONS.VIEWER],
    [RELATIONS.EDITOR]: [RELATIONS.VIEWER],
    [RELATIONS.VIEWER]: [],
  },
};
