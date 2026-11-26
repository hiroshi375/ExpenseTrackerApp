import * as Application from "expo-application";
import Constants from "expo-constants";

import type existingOutputs from "../../amplify_outputs.json";

import { validateAmplifyEnvironment } from "./expectedEnvironments";

type AmplifyOutputs = typeof existingOutputs;

const extra = Constants.expoConfig?.extra;

const outputs = extra?.amplifyOutputs as AmplifyOutputs | undefined;

const validatedVariant = validateAmplifyEnvironment(
    Application.applicationId,
    extra?.appVariant,
    outputs,
);

if (!outputs) {
    throw new Error("Amplify configuration is missing.");
}

export const appVariant = validatedVariant;

export const isSandbox = validatedVariant === "sandbox";

export const amplifyOutputs = outputs;
