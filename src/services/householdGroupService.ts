import "../config/amplifyInit";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({
    authMode: "userPool",
});

type CreateHouseholdGroupInput = {
    name: string;
    displayName?: string | null;
};

export async function createHouseholdGroup({
    name,
    displayName,
}: CreateHouseholdGroupInput) {
    const trimmedName = name.trim();

    if (!trimmedName) {
        throw new Error("グループ名を入力してください。");
    }

    const { data: groupId, errors } = await client.mutations.createHouseholdGroupWithOwner({
        name: trimmedName,
        displayName: displayName?.trim() || undefined,
    });

    if (errors?.length || !groupId) {
        throw new Error("家計簿グループの作成に失敗しました。");
    }

    return groupId;
}

export type HouseholdGroupListItem = {
    groupId: string;
    name: string;
    role: "OWNER" | "ADMIN" | "APPROVER" | "MEMBER";
    memberStatus: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
};

/**
 * 現在ログインしているユーザーが所属する
 * ACTIVEな家計簿グループを取得する
 */
export async function listCurrentUserHouseholdGroups(): Promise<
    HouseholdGroupListItem[]
> {
    const currentUser = await getCurrentUser();
    const userId = currentUser.userId;

    // --------------------------------------------------
    // 1. 自分のGroupMemberを取得
    // --------------------------------------------------
    const memberResult = await client.models.GroupMember.list({
        filter: {
            userId: {
                eq: userId,
            },
            status: {
                eq: "ACTIVE",
            },
        },
        authMode: "userPool",
    });

    if (memberResult.errors?.length) {
        console.error("[GroupMember] list error:", memberResult.errors);

        throw new Error("所属グループの取得に失敗しました。");
    }

    const memberships = memberResult.data;

    if (memberships.length === 0) {
        return [];
    }

    // --------------------------------------------------
    // 2. GroupMemberのgroupIdからHouseholdGroupを取得
    // --------------------------------------------------
    const groups = await Promise.all(
        memberships.map(async (membership) => {
            const groupResult = await client.models.HouseholdGroup.get(
                {
                    groupId: membership.groupId,
                },
                {
                    authMode: "userPool",
                },
            );

            if (groupResult.errors?.length || !groupResult.data) {
                console.error(
                    "[HouseholdGroup] get error:",
                    membership.groupId,
                    groupResult.errors,
                );

                return null;
            }

            if (groupResult.data.status !== "ACTIVE") {
                return null;
            }

            if (!membership.role || !membership.status) {
                console.warn("[GroupMember] invalid membership:", membership);

                return null;
            }

            return {
                groupId: groupResult.data.groupId,
                name: groupResult.data.name,
                role: membership.role,
                memberStatus: membership.status,
            } satisfies HouseholdGroupListItem;
        }),
    );

    return groups
        .filter((group): group is HouseholdGroupListItem => group !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
