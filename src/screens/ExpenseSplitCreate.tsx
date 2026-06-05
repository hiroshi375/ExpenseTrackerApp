import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseSplitCreate">;

const client = generateClient<Schema>();

export default function ExpenseSplitCreate({ route, navigation }: Props) {
  const { receiptImagePath, storeName, paymentMethod, transactionDate, items } =
    route.params;

  const [rows, setRows] = useState(items);
  const [loading, setLoading] = useState(false);

  const updateRow = (index: number, key: string, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: key === "amount" ? Number(value) : value,
            }
          : row,
      ),
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };
  const selectedPaymentMethod = paymentMethod?.trim() || "現金";
  const onSaveAll = async () => {
    try {
      if (!rows.length) {
        Alert.alert("エラー", "登録対象の明細がありません");
        return;
      }

      const invalid = rows.some(
        (row) => !row.title?.trim() || !row.amount || Number.isNaN(row.amount),
      );

      if (invalid) {
        Alert.alert("エラー", "件名または金額が未入力の明細があります");
        return;
      }

      setLoading(true);

      const currentUser = await getCurrentUser();

      for (const row of rows) {
        await client.models.Transaction.create(
          {
            title: row.title,
            amount: Number(row.amount),
            type: "expense",
            categoryId: row.categoryId ?? "default",
            paymentMethod: selectedPaymentMethod,
            transactionDate: transactionDate ?? new Date().toISOString(),
            storeName: storeName ?? "",
            description: row.description ?? "",
            receiptImage: receiptImagePath,
            userId: currentUser.userId,
          },
          {
            authMode: "userPool",
          },
        );
      }

      Alert.alert("成功", `${rows.length}件登録しました`);
      navigation.navigate("ExpenseList");
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "一括登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={{ marginBottom: 12 }}>
        レシート明細を確認し、必要に応じて修正してください。
      </Text>

      {rows.map((row, index) => (
        <Card key={index} style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text>明細 {index + 1}</Text>

            <TextInput
              label="件名"
              value={row.title}
              onChangeText={(text) => updateRow(index, "title", text)}
              mode="outlined"
              style={{ marginTop: 8 }}
            />

            <TextInput
              label="金額"
              value={String(row.amount ?? "")}
              onChangeText={(text) => updateRow(index, "amount", text)}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginTop: 8 }}
            />

            <TextInput
              label="メモ"
              value={row.description ?? ""}
              onChangeText={(text) => updateRow(index, "description", text)}
              mode="outlined"
              style={{ marginTop: 8 }}
            />

            <Button
              mode="outlined"
              onPress={() => removeRow(index)}
              style={{ marginTop: 8 }}
            >
              この明細を削除
            </Button>
          </Card.Content>
        </Card>
      ))}

      <Button
        mode="contained"
        onPress={onSaveAll}
        disabled={loading}
        style={{ marginTop: 12 }}
      >
        {loading ? "登録中..." : "まとめて登録"}
      </Button>
    </ScrollView>
  );
}
