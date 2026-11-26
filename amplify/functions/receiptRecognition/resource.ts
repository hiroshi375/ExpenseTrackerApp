import { defineFunction } from "@aws-amplify/backend";

export const receiptRecognition = defineFunction({
    name: "receiptRecognition",
    entry: "./handler.ts",
    timeoutSeconds: 60,
    memoryMB: 1024,
});
