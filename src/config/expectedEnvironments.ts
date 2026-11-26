export type AppVariant = "existing" | "sandbox";

export const EXPECTED_ENVIRONMENTS = {
    existing: {
        applicationId: "com.anonymous.ExpenseTrackerApp",

        userPoolId: "ap-northeast-1_zRkNOX1xl",

        identityPoolId: "ap-northeast-1:7bce3b51-a80b-490e-8e55-cda7ffda082b",

        apiUrl: "https://kymiimbxnjfs7d2vke3uigapby.appsync-api.ap-northeast-1.amazonaws.com/graphql",

        bucketName:
            "amplify-expensetrackerapp-expensestoragebucket97ab-kigkljncidmn",
    },

    sandbox: {
        applicationId: "com.anonymous.ExpenseTrackerApp.test",

        userPoolId: "ap-northeast-1_QlAlaTZ1R",

        identityPoolId: "ap-northeast-1:7f589276-d053-49db-acf9-0fb4852daafe",

        apiUrl: "https://bbae7ktizrckxjksqbrcksueia.appsync-api.ap-northeast-1.amazonaws.com/graphql",

        bucketName:
            "amplify-expensetrackerapp-expensestoragebucket97ab-mi0dhlfezvp3",
    },
} as const;

export function resolveAppVariant(applicationId: string | null): AppVariant {
    if (applicationId === EXPECTED_ENVIRONMENTS.existing.applicationId) {
        return "existing";
    }

    if (applicationId === EXPECTED_ENVIRONMENTS.sandbox.applicationId) {
        return "sandbox";
    }

    throw new Error("Unknown or unavailable native application ID.");
}

type EnvironmentOutputs = {
    auth?: {
        user_pool_id?: string;
        identity_pool_id?: string;
    };
    data?: {
        url?: string;
    };
    storage?: {
        bucket_name?: string;
    };
};

export function validateAmplifyEnvironment(
    applicationId: string | null,
    configuredVariant: unknown,
    outputs: EnvironmentOutputs | undefined,
): AppVariant {
    const nativeVariant = resolveAppVariant(applicationId);

    if (configuredVariant !== nativeVariant) {
        throw new Error(
            "Native application ID and configured environment do not match.",
        );
    }

    if (!outputs) {
        throw new Error("Amplify configuration is missing.");
    }

    const expected = EXPECTED_ENVIRONMENTS[nativeVariant];

    if (outputs.auth?.user_pool_id !== expected.userPoolId) {
        throw new Error("Cognito User Pool ID mismatch.");
    }

    if (outputs.auth?.identity_pool_id !== expected.identityPoolId) {
        throw new Error("Cognito Identity Pool ID mismatch.");
    }

    if (outputs.data?.url !== expected.apiUrl) {
        throw new Error("AppSync API URL mismatch.");
    }

    if (outputs.storage?.bucket_name !== expected.bucketName) {
        throw new Error("S3 bucket name mismatch.");
    }

    return nativeVariant;
}
