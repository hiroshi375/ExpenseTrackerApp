import "react-native-get-random-values";

import { Amplify } from "aws-amplify";

import { amplifyOutputs, appVariant } from "./amplifyConfig";

Amplify.configure(amplifyOutputs);

if (__DEV__) {
    console.info(`[ExpenseTrackerApp] Environment: ${appVariant}`);
}
