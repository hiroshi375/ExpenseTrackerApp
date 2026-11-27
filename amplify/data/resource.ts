import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
import { householdGroupApi } from "../functions/householdGroupApi/resource";

const schema = a
    .schema({
        HouseholdGroupAccess: a.customType({
            groupId: a.id().required(),
            role: a.string().required(),
        }),

        checkHouseholdGroupAccess: a
            .query()
            .arguments({ groupId: a.id().required() })
            .returns(a.ref("HouseholdGroupAccess").required())
            .authorization((allow) => [allow.authenticated()])
            .handler(a.handler.function(householdGroupApi)),

        createHouseholdGroupWithOwner: a
            .mutation()
            .arguments({
                name: a.string().required(),
                displayName: a.string(),
            })
            .returns(a.id().required())
            .authorization((allow) => [allow.authenticated()])
            .handler(a.handler.function(householdGroupApi)),

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

        Transaction: a
            .model({
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
                groupId: a.id(),
                createdByUserId: a.string(),
                approvedBy: a.string(),
                approvedAt: a.datetime(),
                rejectedBy: a.string(),
                rejectedAt: a.datetime(),
                approvalComment: a.string(),
            })
            .authorization((allow) => [allow.authenticated()]),

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
            .disableOperations(["mutations"])
            .secondaryIndexes((index) => [
                index("createdByUserId").queryField(
                    "listHouseholdGroupsByCreatedByUserId",
                ),
            ])
            .authorization((allow) => [
                allow.ownerDefinedIn("createdByOwner").to(["read"]),
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
                // 所属を追加したユーザーにも参照だけを許可
                allow.ownerDefinedIn("createdByOwner").to(["read"]),
            ]),
    })
    .authorization((allow) => [allow.authenticated()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
});
