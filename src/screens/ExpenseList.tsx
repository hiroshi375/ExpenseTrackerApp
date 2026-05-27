import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { signOut } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Button, Card, FAB, Text } from "react-native-paper";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";
const client = generateClient<Schema>();

export default function ExpenseList() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "ExpenseList">
    >();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------
  // データ取得
  // -----------------------------
  const fetchExpenses = async () => {
    try {
      // -----------------------------
      // Transaction一覧取得
      // -----------------------------
      const result = await client.models.Transaction.list({
        authMode: "userPool",
      });
      console.log("Transactions:", JSON.stringify(result.data, null, 2));
      // -----------------------------
      // User一覧取得
      // -----------------------------
      const users = await client.models.User.list({
        authMode: "userPool",
      });
      // ★追加
      console.log("Users:", JSON.stringify(users.data, null, 2));
      // -----------------------------
      // userId → username 変換Map
      // -----------------------------
      const userMap = new Map();

      users.data.forEach((u) => {
        console.log("MAP:", u.userId, u.username);
        userMap.set(u.userId, u.username);
      });
      // -----------------------------
      // Transactionへ username追加
      // -----------------------------
      const formatted = result.data.map((item) => {
        console.log("MATCH:", item.userId, userMap.get(item.userId));
        return {
          ...item,

          userName: userMap.get(item.userId) ?? "不明",
        };
      });

      const sorted = formatted.sort((a, b) => {
        return (
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
        );
      });
      // -----------------------------
      // State更新
      // -----------------------------
      setExpenses(sorted);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // -----------------------------
  // Pull To Refresh
  // -----------------------------
  const onRefresh = async () => {
    setRefreshing(true);

    await fetchExpenses();

    setRefreshing(false);
  };

  // -----------------------------
  // 金額フォーマット
  // -----------------------------
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  // -----------------------------
  // 日付フォーマット
  // -----------------------------
  const formatDate = (value: string) => {
    const d = new Date(value);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  // -----------------------------
  // フォーカス時にデータ再取得
  // -----------------------------
  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, []),
  );

  // -----------------------------
  // スタイル
  // -----------------------------
  const styles = StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 2, // ←高さ圧縮のポイント
    },
    left: {
      fontSize: 13,
      flex: 1,
    },
    right: {
      fontSize: 13,
      flex: 1,
      textAlign: "right",
    },
    center: {
      fontSize: 13,
      flex: 1,
      textAlign: "center",
    },
    status: {
      fontSize: 12,
      color: "gray",
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Card
            style={{
              margin: 10,
              marginBottom: 2,
            }}
          >
            <Card.Content style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
              {/* 1行目 */}
              <View style={styles.row}>
                <Text style={styles.left}>{item.title}</Text>
                <Text style={styles.right}>{item.storeName}</Text>
              </View>

              {/* 2行目 */}
              <View style={styles.row}>
                <Text style={styles.left}>{formatAmount(item.amount)}</Text>
                <Text style={styles.right}>
                  {formatDate(item.transactionDate)}
                </Text>
              </View>

              {/* 3行目 */}
              <View style={styles.row}>
                <Text style={styles.left}>{item.paymentMethod}</Text>
                <Text style={[styles.center, { textAlign: "center" }]}>
                  {item.userName}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      item.approvalStatus === "approved"
                        ? "green"
                        : item.approvalStatus === "rejected"
                          ? "red"
                          : "gray",
                  }}
                >
                  {item.approvalStatus ?? "未承認"}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      />
      {/* サインアウトボタン */}
      <Button
        mode="outlined"
        onPress={async () => {
          try {
            await signOut();
          } catch (e) {
            console.log("sign out error:", e);
          }
        }}
        style={{
          marginTop: 8,
          marginBottom: 40,
        }}
      >
        サインアウト
      </Button>
      <FAB
        icon="plus"
        style={{
          position: "absolute",
          right: 20,
          bottom: 50,
        }}
        onPress={() => navigation.navigate("ExpenseCreate")}
      />
    </View>
  );
}
