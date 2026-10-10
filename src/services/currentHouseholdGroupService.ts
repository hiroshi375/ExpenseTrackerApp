import AsyncStorage from "@react-native-async-storage/async-storage";

const CURRENT_HOUSEHOLD_GROUP_ID_KEY =
    "expense-tracker-current-household-group-id";

/**
 * 現在使用中の家計簿グループIDを取得
 */
export async function getCurrentHouseholdGroupId(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(CURRENT_HOUSEHOLD_GROUP_ID_KEY);
    } catch (error) {
        console.error("[CurrentHouseholdGroup] get error:", error);
        return null;
    }
}

/**
 * 現在使用する家計簿グループIDを保存
 */
export async function setCurrentHouseholdGroupId(
    groupId: string,
): Promise<void> {
    if (!groupId) {
        throw new Error("groupIdが指定されていません。");
    }

    await AsyncStorage.setItem(CURRENT_HOUSEHOLD_GROUP_ID_KEY, groupId);
}

/**
 * 現在使用中の家計簿グループIDを削除
 */
export async function clearCurrentHouseholdGroupId(): Promise<void> {
    await AsyncStorage.removeItem(CURRENT_HOUSEHOLD_GROUP_ID_KEY);
}
