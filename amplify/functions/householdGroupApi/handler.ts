import type { Schema } from "../../data/resource";
import { requireActiveHouseholdMembership } from "./authorization";
import { createAuthorizationReader } from "./authorizationReader";
import { createHouseholdGroup } from "./createHouseholdGroup";

type AccessEvent = Parameters<Schema["checkHouseholdGroupAccess"]["functionHandler"]>[0];
type CreateEvent = Parameters<Schema["createHouseholdGroupWithOwner"]["functionHandler"]>[0];
type ResolverEvent =
    | (Pick<AccessEvent, "identity" | "arguments"> & { fieldName: "checkHouseholdGroupAccess" })
    | (Pick<CreateEvent, "identity" | "arguments"> & { fieldName: "createHouseholdGroupWithOwner" });

export const handler = async (event: ResolverEvent) => {
    const { COGNITO_ISSUER, GROUP_MEMBER_TABLE_NAME, HOUSEHOLD_GROUP_TABLE_NAME } =
        process.env;
    if (!COGNITO_ISSUER || !GROUP_MEMBER_TABLE_NAME || !HOUSEHOLD_GROUP_TABLE_NAME) {
        throw new Error("Household group authorization is not configured.");
    }

    if (event.fieldName === "createHouseholdGroupWithOwner") {
        return createHouseholdGroup(
            event.identity,
            event.arguments,
            COGNITO_ISSUER,
            GROUP_MEMBER_TABLE_NAME,
            HOUSEHOLD_GROUP_TABLE_NAME,
        );
    }

    if (event.fieldName !== "checkHouseholdGroupAccess") {
        throw new Error("Unsupported household group operation.");
    }

    const { groupId, role } = await requireActiveHouseholdMembership(
        event.identity,
        event.arguments.groupId,
        COGNITO_ISSUER,
        createAuthorizationReader(GROUP_MEMBER_TABLE_NAME, HOUSEHOLD_GROUP_TABLE_NAME),
    );
    return { groupId, role };
};
