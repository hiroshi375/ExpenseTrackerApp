import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import { Button, Card, FAB, Surface, Text } from "react-native-paper";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";

const client = generateClient<Schema>();

const NAVIGATION_STATE_KEY = "expense-tracker-navigation-state-v1";

const handleSignOut = async () => {
    try {
        // 保存済みのNavigation状態を削除
        // これをしないと、次回ログイン時に前回のExpenseCreateなどへ復元される可能性がある
        await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);

        await signOut();
    } catch (e) {
        console.error(e);
        Alert.alert("エラー", "サインアウトに失敗しました");
    }
};

// 長すぎるテキストは省略するユーティリティ関数
const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

// 承認ステータスの表示をわかりやすくするユーティリティ関数
const formatApprovalStatus = (status: string | null | undefined) => {
    if (status === "approved") return "承認済み";
    if (status === "rejected") return "却下";
    if (status === "pending") return "承認待ち";
    return "未承認";
};

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseList">;

export default function ExpenseList({ navigation }: Props) {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [canApprove, setCanApprove] = useState(false);

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
                //console.log("MATCH:", item.userId, userMap.get(item.userId));
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

    // -----------------------------
    // 承認権限の有無を確認
    // -----------------------------
    const fetchCurrentUserRole = async () => {
        try {
            const currentUser = await getCurrentUser();

            const result = await client.models.User.list({
                filter: {
                    userId: {
                        eq: currentUser.userId,
                    },
                },
                authMode: "userPool",
            });

            const user = result.data[0];

            setCanApprove(user?.role === "approver" || user?.role === "admin");
        } catch (e) {
            console.error(e);
            setCanApprove(false);
        }
    };
    useEffect(() => {
        fetchExpenses();
        fetchCurrentUserRole();
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
        },
        right: {
            fontSize: 13,
            textAlign: "right",
        },
        center: {
            fontSize: 13,
            textAlign: "center",
        },
        status: {
            fontSize: 12,
            color: "gray",
        },
        ocr: {
            flex: 1,
            fontSize: 12,
            textAlign: "center",
            color: "blue",
        },
    });

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                style={{ flex: 1 }}
                data={expenses}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                renderItem={({ item }) => (
                    <Card
                        mode="elevated"
                        onPress={() => {
                            console.log("CARD PRESS");
                            navigation.navigate("ExpenseCreate", {
                                expenseId: item.id,
                            });
                        }}
                        style={{
                            margin: 10,
                            marginBottom: 2,
                        }}
                    >
                        <Card.Content
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                            }}
                        >
                            {/* 1行目 */}
                            <View style={styles.row}>
                                <Text style={styles.left}>
                                    {truncateText(item.title, 18)}
                                </Text>
                                <Text style={styles.right}>
                                    {truncateText(item.storeName, 13)}
                                </Text>
                            </View>

                            {/* 2行目 */}
                            <View style={styles.row}>
                                <Text style={styles.left}>
                                    {formatAmount(item.amount)}
                                </Text>
                                <Text style={styles.right}>
                                    {formatDate(item.transactionDate)}
                                </Text>
                            </View>

                            {/* 3行目 */}
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.left}>
                                        {item.paymentMethod}
                                    </Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.center}>
                                        {item.userName}
                                    </Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: "blue",
                                            textAlign: "center",
                                        }}
                                    >
                                        {item.receiptImage ? "OCR" : ""}
                                    </Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            textAlign: "right",
                                            color:
                                                item.approvalStatus ===
                                                "approved"
                                                    ? "green"
                                                    : item.approvalStatus ===
                                                        "rejected"
                                                      ? "red"
                                                      : "gray",
                                        }}
                                    >
                                        {formatApprovalStatus(
                                            item.approvalStatus,
                                        )}
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                )}
            />

            {/* 承認画面へボタン */}
            {canApprove && (
                <Surface
                    elevation={4}
                    style={{
                        alignSelf: "center",
                        width: "90%",
                        marginTop: 6,
                        marginBottom: 12,
                        borderRadius: 12,
                        overflow: "hidden",
                    }}
                >
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate("ApprovalList")}
                        buttonColor="#4f5f6f"
                        textColor="#ffffff"
                        contentStyle={{
                            paddingVertical: 8,
                        }}
                        labelStyle={{
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                        style={{ marginTop: 8, borderRadius: 12 }}
                    >
                        承認画面へ
                    </Button>
                </Surface>
            )}
            {/* サインアウトボタン */}
            <Surface
                elevation={4}
                style={{
                    alignSelf: "center",
                    width: "90%",
                    marginTop: 8,
                    marginBottom: 60,
                    borderRadius: 12,
                    overflow: "hidden",
                }}
            >
                <Button
                    mode="contained"
                    onPress={handleSignOut}
                    buttonColor="#4f5f6f"
                    textColor="#ffffff"
                    contentStyle={{
                        paddingVertical: 8,
                    }}
                    labelStyle={{
                        fontSize: 16,
                        fontWeight: "bold",
                        letterSpacing: 0.5,
                    }}
                    style={{
                        borderRadius: 12,
                    }}
                >
                    サインアウト
                </Button>
            </Surface>

            <FAB
                icon="plus"
                style={{
                    position: "absolute",
                    right: 20,
                    bottom: 90,
                }}
                onPress={() => navigation.navigate("ExpenseCreate")}
            />
        </View>
    );
}
