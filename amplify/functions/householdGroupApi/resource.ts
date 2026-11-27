import { defineFunction } from "@aws-amplify/backend";

export const householdGroupApi = defineFunction({
    name: "householdGroupApi",
    entry: "./handler.ts",
    resourceGroupName: "data",
});
