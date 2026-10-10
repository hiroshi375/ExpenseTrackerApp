import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    RadioButton,
    Text,
} from "react-native-paper";

import type { RootStackParamList } from "../navigation/RootNavigator";
import {
    clearCurrentHouseholdGroupId,
    getCurrentHouseholdGroupId,
    setCurrentHouseholdGroupId,
} from "../services/currentHouseholdGroupService";
import {
    type HouseholdGroupListItem,
    listCurrentUserHouseholdGroups,
} from "../services/householdGroupService";

type Props = NativeStackScreenProps<
    RootStackParamList,
    "HouseholdGroupManagement"
>;

export default function HouseholdGroupManagementScreen({ navigation }: Props) {
    const [groups, setGroups] = useState<HouseholdGroupListItem[]>([]);

    const [currentGroupId, setCurrentGroupIdState] = useState<string | null>(
        null,
    );

    const [loading, setLoading] = useState(true);
    const [selectingGroupId, setSelectingGroupId] = useState<string | null>(
        null,
    );

    // --------------------------------------------------
    // グループ一覧読み込み
    // --------------------------------------------------
    const loadGroups = useCallback(async () => {
        try {
            setLoading(true);

            const [groupList, savedGroupId] = await Promise.all([
                listCurrentUserHouseholdGroups(),
                getCurrentHouseholdGroupId(),
            ]);

            setGroups(groupList);

            // --------------------------------------------------
            // 保存済みcurrentGroupIdが
            // 現在も所属しているグループか確認
            // --------------------------------------------------
            const savedGroupExists =
                savedGroupId !== null &&
                groupList.some((group) => group.groupId === savedGroupId);

            if (savedGroupExists) {
                setCurrentGroupIdState(savedGroupId);
                return;
            }

            // --------------------------------------------------
            // 保存済みグループが無効になっている場合
            // --------------------------------------------------
            if (savedGroupId) {
                await clearCurrentHouseholdGroupId();
            }

            // --------------------------------------------------
            // 所属グループが1つだけなら自動選択
            // --------------------------------------------------
            if (groupList.length === 1) {
                const firstGroup = groupList[0];

                await setCurrentHouseholdGroupId(firstGroup.groupId);

                setCurrentGroupIdState(firstGroup.groupId);

                return;
            }

            setCurrentGroupIdState(null);
        } catch (error) {
            console.error("[HouseholdGroupManagement] load error:", error);

            Alert.alert(
                "取得エラー",
                error instanceof Error
                    ? error.message
                    : "家計簿グループの取得に失敗しました。",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadGroups();
        }, [loadGroups]),
    );

    // --------------------------------------------------
    // 使用グループ選択
    // --------------------------------------------------
    const handleSelectGroup = async (group: HouseholdGroupListItem) => {
        if (selectingGroupId) {
            return;
        }

        try {
            setSelectingGroupId(group.groupId);

            await setCurrentHouseholdGroupId(group.groupId);

            setCurrentGroupIdState(group.groupId);

            Alert.alert(
                "グループを変更しました",
                `「${group.name}」を使用します。`,
            );
        } catch (error) {
            console.error("[HouseholdGroupManagement] select error:", error);

            Alert.alert(
                "変更エラー",
                "使用するグループを変更できませんでした。",
            );
        } finally {
            setSelectingGroupId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />

                <Text style={styles.loadingText}>
                    グループを読み込んでいます...
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text variant="titleLarge">家計簿グループ</Text>

                <Text variant="bodyMedium" style={styles.description}>
                    使用する家計簿グループを選択してください。
                </Text>
            </View>

            <FlatList
                data={groups}
                keyExtractor={(item) => item.groupId}
                contentContainerStyle={
                    groups.length === 0 ? styles.emptyList : styles.list
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text variant="titleMedium">
                            所属グループがありません
                        </Text>

                        <Text
                            variant="bodyMedium"
                            style={styles.emptyDescription}
                        >
                            新しい家計簿グループを作成してください。
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const selected = item.groupId === currentGroupId;

                    const selecting = item.groupId === selectingGroupId;

                    return (
                        <Card
                            mode={selected ? "elevated" : "outlined"}
                            style={styles.card}
                            onPress={() => {
                                void handleSelectGroup(item);
                            }}
                        >
                            <Card.Content>
                                <View style={styles.groupRow}>
                                    <RadioButton
                                        value={item.groupId}
                                        status={
                                            selected ? "checked" : "unchecked"
                                        }
                                        onPress={() => {
                                            void handleSelectGroup(item);
                                        }}
                                        disabled={selectingGroupId !== null}
                                    />

                                    <View style={styles.groupContent}>
                                        <Text
                                            variant="titleMedium"
                                            style={styles.groupName}
                                        >
                                            {item.name}
                                        </Text>

                                        <Text variant="bodySmall">
                                            権限：
                                            {formatRole(item.role)}
                                        </Text>

                                        {selected && (
                                            <Text
                                                variant="bodySmall"
                                                style={styles.currentLabel}
                                            >
                                                現在使用中
                                            </Text>
                                        )}

                                        {selecting && (
                                            <ActivityIndicator
                                                size="small"
                                                style={styles.selecting}
                                            />
                                        )}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    );
                }}
            />

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => navigation.navigate("HouseholdGroupCreate")}
                    contentStyle={{
                        paddingVertical: 6,
                    }}
                >
                    新しいグループを作成
                </Button>
            </View>
        </View>
    );
}

function formatRole(role: HouseholdGroupListItem["role"]): string {
    switch (role) {
        case "OWNER":
            return "オーナー";

        case "ADMIN":
            return "管理者";

        case "APPROVER":
            return "承認者";

        case "MEMBER":
            return "メンバー";

        default:
            return role;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    loadingText: {
        marginTop: 12,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },

    description: {
        marginTop: 6,
        color: "#666666",
    },

    list: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },

    emptyList: {
        flexGrow: 1,
    },

    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },

    emptyDescription: {
        marginTop: 8,
        textAlign: "center",
        color: "#666666",
    },

    card: {
        marginTop: 10,
    },

    groupRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    groupContent: {
        flex: 1,
        marginLeft: 4,
    },

    groupName: {
        fontWeight: "700",
    },

    currentLabel: {
        marginTop: 4,
        color: "#1976d2",
        fontWeight: "700",
    },

    selecting: {
        marginTop: 6,
        alignSelf: "flex-start",
    },

    footer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
        backgroundColor: "#ffffff",
    },
});
