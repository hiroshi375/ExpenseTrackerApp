import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import * as Crypto from "expo-crypto";

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

    const currentUser = await getCurrentUser();

    const userId = currentUser.userId;
    const groupId = Crypto.randomUUID();
    const now = new Date().toISOString();

    // --------------------------------------------------
    // 1. HouseholdGroup作成
    // --------------------------------------------------
    const groupResult = await client.models.HouseholdGroup.create(
        {
            groupId,
            name: trimmedName,

            // 業務ロジック用
            createdByUserId: userId,

            // Amplify owner認可用
            createdByOwner: userId,

            // 作成直後は作成者本人だけ
            memberOwners: [userId],

            status: "ACTIVE",
        },
        {
            authMode: "userPool",
        },
    );

    if (groupResult.errors?.length || !groupResult.data) {
        console.error("[HouseholdGroup] create error:", groupResult.errors);

        throw new Error("家計簿グループの作成に失敗しました。");
    }

    const createdGroup = groupResult.data;

    try {
        // --------------------------------------------------
        // 2. 作成者自身をOWNERとしてGroupMember登録
        // --------------------------------------------------
        const memberResult = await client.models.GroupMember.create(
            {
                groupId,
                userId,

                // 本人参照用owner
                memberOwner: userId,

                displayName:
                    displayName?.trim() || currentUser.username || "ユーザー",

                role: "OWNER",
                status: "ACTIVE",

                joinedAt: now,

                // 誰がメンバーを追加したか
                createdByUserId: userId,

                // Amplify owner認可用
                createdByOwner: userId,

                // 現時点では作成者本人のみ
                groupOwners: [userId],
            },
            {
                authMode: "userPool",
            },
        );

        if (memberResult.errors?.length || !memberResult.data) {
            console.error("[GroupMember] create error:", memberResult.errors);

            throw new Error("グループメンバーの登録に失敗しました。");
        }

        return {
            group: createdGroup,
            member: memberResult.data,
        };
    } catch (error) {
        // --------------------------------------------------
        // GroupMember作成に失敗した場合、
        // HouseholdGroupだけ残るのを防ぐ
        // --------------------------------------------------
        console.error("[HouseholdGroup] owner member creation failed:", error);

        try {
            const rollbackResult = await client.models.HouseholdGroup.delete(
                {
                    groupId,
                },
                {
                    authMode: "userPool",
                },
            );

            if (rollbackResult.errors?.length) {
                console.error(
                    "[HouseholdGroup] rollback error:",
                    rollbackResult.errors,
                );
            }
        } catch (rollbackError) {
            console.error(
                "[HouseholdGroup] rollback exception:",
                rollbackError,
            );
        }

        throw error;
    }
}
