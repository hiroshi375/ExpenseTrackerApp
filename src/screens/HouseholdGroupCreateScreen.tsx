import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Text,
    TextInput,
} from "react-native-paper";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { createHouseholdGroup } from "../services/householdGroupService";

type Props = NativeStackScreenProps<RootStackParamList, "HouseholdGroupCreate">;

export default function HouseholdGroupCreateScreen({ navigation }: Props) {
    const [groupName, setGroupName] = useState("");
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        const trimmedName = groupName.trim();

        if (!trimmedName) {
            Alert.alert("入力確認", "家計簿グループ名を入力してください。");
            return;
        }

        if (saving) {
            return;
        }

        try {
            setSaving(true);

            const result = await createHouseholdGroup({
                name: trimmedName,
            });

            console.log("[HouseholdGroupCreate] group:", result.group);

            console.log("[HouseholdGroupCreate] owner member:", result.member);

            Alert.alert("作成完了", `「${trimmedName}」を作成しました。`, [
                {
                    text: "OK",
                    onPress: () => {
                        navigation.goBack();
                    },
                },
            ]);
        } catch (error) {
            console.error("[HouseholdGroupCreate] error:", error);

            Alert.alert(
                "作成エラー",
                error instanceof Error
                    ? error.message
                    : "家計簿グループの作成に失敗しました。",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.title}>
                            家計簿グループを作成
                        </Text>

                        <Text variant="bodyMedium" style={styles.description}>
                            家族やメンバーと共有する家計簿グループを作成します。
                            作成したユーザーはグループのOWNERになります。
                        </Text>

                        <TextInput
                            label="グループ名"
                            value={groupName}
                            onChangeText={setGroupName}
                            mode="outlined"
                            placeholder="例：佐藤家"
                            maxLength={50}
                            disabled={saving}
                            style={styles.input}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                void handleCreate();
                            }}
                        />

                        <Text variant="bodySmall" style={styles.counter}>
                            {groupName.length} / 50
                        </Text>

                        <View style={styles.buttonArea}>
                            <Button
                                mode="contained"
                                onPress={() => {
                                    void handleCreate();
                                }}
                                disabled={saving || !groupName.trim()}
                            >
                                {saving ? "作成中..." : "グループを作成"}
                            </Button>

                            <Button
                                mode="text"
                                onPress={() => navigation.goBack()}
                                disabled={saving}
                                style={styles.cancelButton}
                            >
                                キャンセル
                            </Button>
                        </View>

                        {saving && (
                            <View style={styles.loadingArea}>
                                <ActivityIndicator />
                                <Text
                                    variant="bodySmall"
                                    style={styles.loadingText}
                                >
                                    グループを作成しています...
                                </Text>
                            </View>
                        )}
                    </Card.Content>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    scrollContent: {
        padding: 16,
    },

    card: {
        borderRadius: 12,
    },

    title: {
        fontWeight: "700",
        marginBottom: 8,
    },

    description: {
        marginBottom: 24,
        lineHeight: 22,
    },

    input: {
        backgroundColor: "#ffffff",
    },

    counter: {
        textAlign: "right",
        marginTop: 4,
    },

    buttonArea: {
        marginTop: 24,
    },

    cancelButton: {
        marginTop: 8,
    },

    loadingArea: {
        marginTop: 20,
        alignItems: "center",
    },

    loadingText: {
        marginTop: 8,
    },
});
