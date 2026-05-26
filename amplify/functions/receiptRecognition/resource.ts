import { defineFunction } from '@aws-amplify/backend';

export const receiptRecognition = defineFunction({
  name: 'receiptRecognition',
  entry: './handler.ts',
});
