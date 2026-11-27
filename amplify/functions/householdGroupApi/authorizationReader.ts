import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { HouseholdGroupAuthorizationReader } from "./authorization";
import { dynamo } from "./dynamo";

export function createAuthorizationReader(
    membershipTable: string,
    groupTable: string,
): HouseholdGroupAuthorizationReader {
    return {
        async getMembership(groupId, userId) {
            const { Item } = await dynamo.send(new GetCommand({
                TableName: membershipTable,
                Key: { groupId, userId },
                ConsistentRead: true,
                ProjectionExpression: "groupId, userId, #status, #role",
                ExpressionAttributeNames: { "#status": "status", "#role": "role" },
            }));
            // 認可処理がキー、状態、ロールを検証する。
            return (Item ?? null) as Awaited<
                ReturnType<HouseholdGroupAuthorizationReader["getMembership"]>
            >;
        },
        async getGroup(groupId) {
            const { Item } = await dynamo.send(new GetCommand({
                TableName: groupTable,
                Key: { groupId },
                ConsistentRead: true,
                ProjectionExpression: "groupId, #status",
                ExpressionAttributeNames: { "#status": "status" },
            }));
            return (Item ?? null) as Awaited<
                ReturnType<HouseholdGroupAuthorizationReader["getGroup"]>
            >;
        },
    };
}
