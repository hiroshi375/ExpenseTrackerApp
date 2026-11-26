/* global __dirname */

const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
    const variant = process.env.APP_VARIANT;

    if (variant !== "existing" && variant !== "sandbox") {
        throw new Error("APP_VARIANT must be existing or sandbox.");
    }

    const isSandbox = variant === "sandbox";

    const configFile = isSandbox
        ? "amplify_outputs.sandbox.json"
        : "amplify_outputs.json";

    const configPath = path.join(__dirname, configFile);

    if (!fs.existsSync(configPath)) {
        throw new Error(`Amplify configuration not found: ${configFile}`);
    }

    const amplifyOutputs = JSON.parse(fs.readFileSync(configPath, "utf8"));

    const expected = isSandbox
        ? {
              userPoolId: "ap-northeast-1_QlAlaTZ1R",
              identityPoolId:
                  "ap-northeast-1:7f589276-d053-49db-acf9-0fb4852daafe",
              apiUrl: "https://bbae7ktizrckxjksqbrcksueia.appsync-api.ap-northeast-1.amazonaws.com/graphql",
              bucketName:
                  "amplify-expensetrackerapp-expensestoragebucket97ab-mi0dhlfezvp3",
          }
        : {
              userPoolId: "ap-northeast-1_zRkNOX1xl",
              identityPoolId:
                  "ap-northeast-1:7bce3b51-a80b-490e-8e55-cda7ffda082b",
              apiUrl: "https://kymiimbxnjfs7d2vke3uigapby.appsync-api.ap-northeast-1.amazonaws.com/graphql",
              bucketName:
                  "amplify-expensetrackerapp-expensestoragebucket97ab-kigkljncidmn",
          };

    if (
        amplifyOutputs.auth?.user_pool_id !== expected.userPoolId ||
        amplifyOutputs.auth?.identity_pool_id !== expected.identityPoolId ||
        amplifyOutputs.data?.url !== expected.apiUrl ||
        amplifyOutputs.storage?.bucket_name !== expected.bucketName
    ) {
        throw new Error(`Amplify environment mismatch: ${variant}`);
    }

    const extra = {
        ...config.extra,
    };

    if (isSandbox) {
        delete extra.eas;

        if (process.env.EXPO_PUBLIC_RECEIPT_RECOGNITION_API_URL?.trim()) {
            throw new Error(
                "OCR API must not be configured for the sandbox yet.",
            );
        }
    }

    return {
        ...config,

        name: isSandbox ? "ExpenseTracker TEST" : config.name,

        scheme: isSandbox ? "expensetrackerapp-test" : config.scheme,

        ios: {
            ...config.ios,
            bundleIdentifier: isSandbox
                ? "com.anonymous.ExpenseTrackerApp.test"
                : config.ios.bundleIdentifier,
        },

        android: {
            ...config.android,
            package: isSandbox
                ? "com.anonymous.ExpenseTrackerApp.test"
                : config.android.package,
        },

        ...(isSandbox
            ? {
                  updates: {
                      ...config.updates,
                      enabled: false,
                  },
              }
            : {}),

        extra: {
            ...extra,
            appVariant: variant,
            amplifyOutputs,
            expectedAmplifyEnvironment: expected,
        },
    };
};
