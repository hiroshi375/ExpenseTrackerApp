import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { generateClient } from "aws-amplify/data";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";

const client = generateClient<Schema>();

type Props = NativeStackScreenProps<RootStackParamList, "ApprovalList">;

export default function ApprovalList({ navigation }: Props) {
  const [items, setItems] = useState<Schema["Transaction"]["type"][]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingExpenses = async () => {
    try {
      const result = await client.models.Transaction.list({
        authMode: "userPool",
      });

      const pendingItems = result.data.filter(
        (item) => !item.approvalStatus || item.approvalStatus === "pending",
      );

      const sorted = pendingItems.sort((a, b) => {
        return (
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
        );
      });

      setItems(sorted);
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "承認対象の取得に失敗しました");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingExpenses();
    setRefreshing(false);
  };

  const approveExpense = async (id: string) => {
    try {
      await client.models.Transaction.update(
        {
          id,
          approvalStatus: "approved",
        },
        {
          authMode: "userPool",
        },
      );

      Alert.alert("完了", "承認しました");
      await fetchPendingExpenses();
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "承認に失敗しました");
    }
  };

  const rejectExpense = async (id: string) => {
    try {
      await client.models.Transaction.update(
        {
          id,
          approvalStatus: "rejected",
        },
        {
          authMode: "userPool",
        },
      );

      Alert.alert("完了", "却下しました");
      await fetchPendingExpenses();
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "却下に失敗しました");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (value: string) => {
    const d = new Date(value);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingExpenses();
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80,
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            承認待ちの経費はありません
          </Text>
        }
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.title}>
                {item.title}
              </Text>

              <View style={styles.row}>
                <Text style={styles.label}>金額</Text>
                <Text style={styles.value}>{formatAmount(item.amount)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>店舗名</Text>
                <Text style={styles.value}>{item.storeName ?? ""}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>支払方法</Text>
                <Text style={styles.value}>{item.paymentMethod}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>利用日</Text>
                <Text style={styles.value}>
                  {formatDate(item.transactionDate)}
                </Text>
              </View>

              <View style={styles.memoArea}>
                <Text style={styles.label}>メモ</Text>
                <Text>{item.description ?? ""}</Text>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={() => approveExpense(item.id)}
                  buttonColor="#4f6f5f"
                  textColor="#ffffff"
                  style={styles.button}
                >
                  承認
                </Button>

                <Button
                  mode="contained"
                  onPress={() => rejectExpense(item.id)}
                  buttonColor="#6f5f5f"
                  textColor="#ffffff"
                  style={styles.button}
                >
                  却下
                </Button>
              </View>

              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate("ExpenseCreate", {
                    expenseId: item.id,
                  })
                }
                style={{ marginTop: 12 }}
              >
                詳細を確認
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: {
    marginBottom: 12,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  label: {
    color: "gray",
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    textAlign: "right",
  },
  memoArea: {
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  button: {
    flex: 1,
  },
});
