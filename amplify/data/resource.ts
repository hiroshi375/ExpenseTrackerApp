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

        HouseholdGroup: a
            .model({
                groupId: a.id().required(),
                name: a.string().required(),
                // 業務上のユーザーID
                createdByUserId: a.string().required(),
                // Amplify owner認可専用
                createdByOwner: a.string().required(),
                memberOwners: a.string().array(),
                status: a.enum(["ACTIVE", "ARCHIVED"]),
            })
            .identifier(["groupId"])
            .secondaryIndexes((index) => [
                index("createdByUserId").queryField(
                    "listHouseholdGroupsByCreatedByUserId",
                ),
            ])
            .authorization((allow) => [
                allow.ownerDefinedIn("createdByOwner"),
                allow.ownersDefinedIn("memberOwners").to(["read"]),
            ]),

        GroupMember: a
            .model({
                // 所属グループ
                groupId: a.id().required(),
                // Cognito userId
                // 複合主キーのsort keyとして使用
                userId: a.string().required(),
                // owner認可専用フィールド
                // userIdを直接owner fieldに使えないため分離
                memberOwner: a.string().required(),
                // グループ内で表示する名前
                displayName: a.string(),
                // グループ内での権限
                role: a.enum(["OWNER", "ADMIN", "APPROVER", "MEMBER"]),
                // メンバー状態
                status: a.enum(["ACTIVE", "INVITED", "SUSPENDED", "LEFT"]),
                // 参加日時
                joinedAt: a.datetime(),
                // このメンバーを追加したユーザー
                // 業務上「誰がこのメンバーを追加したか」
                createdByUserId: a.string().required(),
                // Amplify owner認可専用
                createdByOwner: a.string().required(),
                // 同じグループに属するユーザーのowner情報
                groupOwners: a.string().array(),
            })
            .identifier(["groupId", "userId"])
            .secondaryIndexes((index) => [
                index("groupId").queryField("listGroupMembersByGroupId"),
                index("userId").queryField("listGroupMembershipsByUserId"),
            ])
            .authorization((allow) => [
                // メンバー本人
                allow.ownerDefinedIn("memberOwner").to(["read"]),
                // 同じグループのメンバー
                allow.ownersDefinedIn("groupOwners").to(["read"]),
                // Phase 1では追加したユーザーが管理
                allow.ownerDefinedIn("createdByOwner"),
            ]),
    })
    .authorization((allow) => [allow.authenticated()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
});
