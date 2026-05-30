import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a
  .schema({
    User: a.model({
      userId: a.id().required(),
      username: a.string().required(),
      email: a.email().required(),
      role: a.string(),
      lastLoginAt: a.datetime(),
    }),

    Category: a.model({
      name: a.string().required(),
      parentCategoryName: a.string(),
      type: a.string(),
      iconImage: a.string(),
      color: a.string(),
    }),

    Transaction: a.model({
      type: a.string().required(),
      amount: a.float().required(),
      categoryId: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      paymentMethod: a.string().required(),
      transactionDate: a.datetime().required(),
      receiptImage: a.string(),
      storeName: a.string(),
      tags: a.string(),
      approvalStatus: a.string(),

      userId: a.id().required(),
      approvedBy: a.string(),
      approvedAt: a.datetime(),
      rejectedBy: a.string(),
      rejectedAt: a.datetime(),
      approvalComment: a.string(),
    }),
  })
  .authorization((allow) => [allow.authenticated()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});
