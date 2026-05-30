import { NavigationContainer } from "@react-navigation/native";
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

const client = generateClient<Schema>();

export type RootStackParamList = {
  ExpenseList: undefined;
  ExpenseCreate:
    | {
        expenseId?: string; // ←追加
      }
    | undefined;
  ApprovalList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // -----------------------------
  // State
  // -----------------------------
  const [loading, setLoading] = useState(true);

  const [needsProfile, setNeedsProfile] = useState(false);
  // -----------------------------
  // 初回ログイン確認
  // -----------------------------
  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const user = await getCurrentUser();

      const email = user.signInDetails?.loginId;

      if (!email) {
        setLoading(false);
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Loading
  // -----------------------------
  if (loading) {
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
        onComplete={() => {
          setNeedsProfile(false);
        }}
      />
    );
  }

  // -----------------------------
  // Main Navigator
  // -----------------------------
  return (
    <NavigationContainer>
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
          name="ApprovalList"
          component={ApprovalList}
          options={{
            title: "経費承認",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
