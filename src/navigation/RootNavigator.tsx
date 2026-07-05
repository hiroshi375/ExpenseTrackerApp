import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    NavigationContainer,
    type InitialState,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Schema } from "../../amplify/data/resource";
import ApprovalList from "../screens/ApprovalList";
import CreateProfileScreen from "../screens/CreateProfileScreen";
import ExpenseCreate from "../screens/ExpenseCreate";
import ExpenseList from "../screens/ExpenseList";
import ExpenseSplitCreate from "../screens/ExpenseSplitCreate";
import ReceiptCameraScreen from "../screens/ReceiptCameraScreen";

const client = generateClient<Schema>();

const NAVIGATION_STATE_KEY = "expense-tracker-navigation-state-v1";

export type SplitExpenseItem = {
    title: string;
    amount: number;
    categoryId?: string;
    description?: string;
};

export type RootStackParamList = {
    ExpenseList: undefined;
    ExpenseCreate:
        | {
              expenseId?: string;
              capturedImageUri?: string;
              capturedImageWidth?: number;
              capturedImageHeight?: number;
          }
        | undefined;
    ApprovalList: undefined;
    ExpenseSplitCreate: {
        receiptImagePath: string;
        receiptImageUrl?: string;
        storeName?: string;
        paymentMethod?: string;
        transactionDate?: string;
        items: SplitExpenseItem[];
    };
    ReceiptCamera: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    // -----------------------------
    // State
    // -----------------------------
    const [loading, setLoading] = useState(true);
    const [needsProfile, setNeedsProfile] = useState(false);

    // Navigation復元用
    const [navigationReady, setNavigationReady] = useState(false);
    const [initialNavigationState, setInitialNavigationState] = useState<
        InitialState | undefined
    >(undefined);

    // -----------------------------
    // 初回ログイン確認 + Navigation状態復元
    // -----------------------------
    useEffect(() => {
        const initialize = async () => {
            await Promise.all([checkProfile(), restoreNavigationState()]);
        };

        initialize();
    }, []);

    const checkProfile = async () => {
        try {
            const user = await getCurrentUser();

            const email = user.signInDetails?.loginId;

            if (!email) {
                return;
            }

            // -----------------------------
            // Userテーブル確認
            // -----------------------------
            const result = await client.models.User.list({
                filter: {
                    email: {
                        eq: email,
                    },
                },
                authMode: "userPool",
            });

            console.log("User Check:", JSON.stringify(result, null, 2));

            // -----------------------------
            // 初回ログイン判定
            // -----------------------------
            if (result.data.length === 0) {
                setNeedsProfile(true);

                // 初回プロフィール登録画面に行く場合は、
                // 古いNavigation状態を使わない
                await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const restoreNavigationState = async () => {
        try {
            const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);

            if (savedState) {
                setInitialNavigationState(JSON.parse(savedState));
            }
        } catch (e) {
            console.error("Navigation state restore error:", e);

            // 壊れたstateが残っていると起動時に詰まるため削除
            await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
        } finally {
            setNavigationReady(true);
        }
    };

    // -----------------------------
    // Loading
    // -----------------------------
    if (loading || !navigationReady) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator />
            </View>
        );
    }

    // -----------------------------
    // 初回プロフィール登録
    // -----------------------------
    if (needsProfile) {
        return (
            <CreateProfileScreen
                onComplete={async () => {
                    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
                    setNeedsProfile(false);
                }}
            />
        );
    }

    // -----------------------------
    // Main Navigator
    // -----------------------------
    return (
        <NavigationContainer
            initialState={initialNavigationState}
            onStateChange={(state) => {
                AsyncStorage.setItem(
                    NAVIGATION_STATE_KEY,
                    JSON.stringify(state),
                ).catch((e) => {
                    console.error("Navigation state save error:", e);
                });
            }}
        >
            <Stack.Navigator initialRouteName="ExpenseList">
                <Stack.Screen
                    name="ExpenseList"
                    component={ExpenseList}
                    options={{
                        title: "経費リスト",
                    }}
                />
                <Stack.Screen
                    name="ExpenseCreate"
                    component={ExpenseCreate}
                    options={{
                        title: "経費登録・更新",
                    }}
                />
                <Stack.Screen
                    name="ReceiptCamera"
                    component={ReceiptCameraScreen}
                    options={{
                        title: "レシート撮影",
                    }}
                />
                <Stack.Screen
                    name="ApprovalList"
                    component={ApprovalList}
                    options={{
                        title: "経費承認",
                    }}
                />
                <Stack.Screen
                    name="ExpenseSplitCreate"
                    component={ExpenseSplitCreate}
                    options={{ title: "経費分割登録" }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
