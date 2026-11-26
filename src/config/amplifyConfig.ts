import Constants from "expo-constants";

import type existingOutputs from "../../amplify_outputs.json";

type AmplifyOutputs = typeof existingOutputs;

const extra = Constants.expoConfig?.extra;

const variant = extra?.appVariant;

if (variant !== "existing" && variant !== "sandbox") {
    throw new Error("Invalid application environment.");
}

const outputs = extra?.amplifyOutputs as AmplifyOutputs | undefined;

const expected = extra?.expectedAmplifyEnvironment;

if (!outputs || !expected) {
    throw new Error("Amplify configuration is missing.");
}

if (
    outputs.auth?.user_pool_id !== expected.userPoolId ||
    outputs.auth?.identity_pool_id !== expected.identityPoolId ||
    outputs.data?.url !== expected.apiUrl ||
    outputs.storage?.bucket_name !== expected.bucketName
) {
    throw new Error("Amplify environment validation failed.");
}

export const appVariant = variant;

export const isSandbox = variant === "sandbox";

export const amplifyOutputs = outputs;
