import { randomUUID } from "node:crypto";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { requireCognitoUserId } from "./authorization";
import { dynamo } from "./dynamo";

export async function createHouseholdGroup(
    identity: unknown,
    input: { name: string; displayName?: string | null },
    issuer: string,
    membershipTable: string,
    groupTable: string,
) {
    const userId = requireCognitoUserId(identity, issuer);
    const name = input.name.trim();
    if (!name) {
        throw new Error("グループ名を入力してください。");
    }

    const username =
        identity && typeof identity === "object" && "username" in identity &&
        typeof identity.username === "string"
            ? identity.username
            : "";
    const groupId = randomUUID();
    const now = new Date().toISOString();
    const shared = {
        groupId,
        createdByUserId: userId,
        createdByOwner: userId,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
    };

    await dynamo.send(new TransactWriteCommand({
        ClientRequestToken: groupId,
        TransactItems: [
            {
                Put: {
                    TableName: groupTable,
                    Item: {
                        ...shared,
                        __typename: "HouseholdGroup",
                        name,
                        memberOwners: [userId],
                    },
                    ConditionExpression: "attribute_not_exists(groupId)",
                },
            },
            {
                Put: {
                    TableName: membershipTable,
                    Item: {
                        ...shared,
                        __typename: "GroupMember",
                        userId,
                        memberOwner: userId,
                        groupOwners: [userId],
                        displayName: input.displayName?.trim() || username || "ユーザー",
                        role: "OWNER",
                        joinedAt: now,
                    },
                    ConditionExpression: "attribute_not_exists(groupId)",
                },
            },
        ],
    }));

    return groupId;
}
