import { defineBackend } from "@aws-amplify/backend";

import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { householdGroupApi } from "./functions/householdGroupApi/resource";
import { receiptRecognition } from "./functions/receiptRecognition/resource";
import { storage } from "./storage/resource";
const backend = defineBackend({
  auth,
  data,
  storage,
  receiptRecognition,
  householdGroupApi,
});

const { GroupMember, HouseholdGroup } = backend.data.resources.tables;
const householdGroupLambda = backend.householdGroupApi.resources.lambda;

householdGroupLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem"],
    resources: [GroupMember.tableArn, HouseholdGroup.tableArn],
  }),
);
householdGroupLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["dynamodb:PutItem"],
    resources: [GroupMember.tableArn, HouseholdGroup.tableArn],
    conditions: {
      StringEquals: { "dynamodb:EnclosingOperation": "TransactWriteItems" },
    },
  }),
);
backend.householdGroupApi.addEnvironment(
  "GROUP_MEMBER_TABLE_NAME",
  GroupMember.tableName,
);
backend.householdGroupApi.addEnvironment(
  "HOUSEHOLD_GROUP_TABLE_NAME",
  HouseholdGroup.tableName,
);
backend.householdGroupApi.addEnvironment(
  "COGNITO_ISSUER",
  `https://${backend.auth.resources.userPool.userPoolProviderName}`,
);

// -----------------------------
// Bedrock Invoke権限
// -----------------------------
backend.receiptRecognition.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["bedrock:InvokeModel"],
    resources: ["*"],
  }),
);
