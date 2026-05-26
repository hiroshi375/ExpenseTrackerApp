import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'ExpenseStorage',

  access: (allow) => ({
    'receipt/*': [
      allow.authenticated.to(['read', 'write']),
    ],

    'icon/*': [
      allow.authenticated.to(['read']),
    ],
  }),
});
