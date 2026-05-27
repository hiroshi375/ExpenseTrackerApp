import { defineStorage } from "@aws-amplify/backend";
import { receiptRecognition } from "../functions/receiptRecognition/resource";

export const storage = defineStorage({
  name: "ExpenseStorage",

  access: (allow) => ({
    "receipt/*": [
      // Expoアプリ用
      allow.authenticated.to(["read", "write"]),
      // Lambda用
      allow.resource(receiptRecognition).to(["read", "write"]),
      //allow.authenticated.to(['read', 'write']),
    ],

    "icon/*": [allow.authenticated.to(["read"])],
  }),
});
