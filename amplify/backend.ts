import { defineBackend } from "@aws-amplify/backend";

import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { receiptRecognition } from "./functions/receiptRecognition/resource";
import { storage } from "./storage/resource";
const backend = defineBackend({
  auth,
  data,
  storage,
  receiptRecognition,
});

// -----------------------------
// Bedrock Invoke権限
// -----------------------------
backend.receiptRecognition.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["bedrock:InvokeModel"],
    resources: ["*"],
  }),
);
