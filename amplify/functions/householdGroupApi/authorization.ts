import type { Schema } from "../../data/resource";

type GroupMember = Schema["GroupMember"]["type"];
type HouseholdGroup = Schema["HouseholdGroup"]["type"];

export interface HouseholdGroupAuthorizationReader {
    getMembership(
        groupId: string,
        userId: string,
    ): Promise<Pick<GroupMember, "groupId" | "userId" | "status" | "role"> | null>;
    getGroup(
        groupId: string,
    ): Promise<Pick<HouseholdGroup, "groupId" | "status"> | null>;
}

const membershipRoles = new Set<NonNullable<GroupMember["role"]>>([
    "OWNER",
    "ADMIN",
    "APPROVER",
    "MEMBER",
]);

export function requireCognitoUserId(
    identity: unknown,
    expectedIssuer: string,
): string {
    // identity は AppSync の認証済みコンテキストから受け取る。
    if (
        typeof identity !== "object" ||
        identity === null ||
        !expectedIssuer ||
        !("issuer" in identity) ||
        identity.issuer !== expectedIssuer ||
        !("sub" in identity) ||
        typeof identity.sub !== "string" ||
        !identity.sub.trim()
    ) {
        throw new Error("Unauthorized.");
    }

    return identity.sub;
}

export async function requireActiveHouseholdMembership(
    identity: unknown,
    groupId: unknown,
    expectedIssuer: string,
    reader: HouseholdGroupAuthorizationReader,
) {
    const userId = requireCognitoUserId(identity, expectedIssuer);
    if (typeof groupId !== "string" || !groupId.trim()) {
        throw new Error("Unauthorized.");
    }

    const membership = await reader.getMembership(groupId, userId);
    if (
        !membership ||
        membership.groupId !== groupId ||
        membership.userId !== userId ||
        membership.status !== "ACTIVE" ||
        !membership.role ||
        !membershipRoles.has(membership.role)
    ) {
        throw new Error("Unauthorized.");
    }

    const group = await reader.getGroup(groupId);
    if (!group || group.groupId !== groupId || group.status !== "ACTIVE") {
        throw new Error("Unauthorized.");
    }

    return { userId, groupId, role: membership.role };
}
