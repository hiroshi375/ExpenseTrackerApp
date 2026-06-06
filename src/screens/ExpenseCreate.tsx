import { useNavigation } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { getUrl, uploadData } from "aws-amplify/storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Menu,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseCreate">;

const client = generateClient<Schema>();

export default function ExpenseCreate({ route }: Props) {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "ExpenseCreate">
    >();

  const expenseId = route.params?.expenseId;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null); //今回新しく選択・撮影したローカル画像の表示用

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("現金");
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString(),
  );
  const [open, setOpen] = useState(false);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);
  const [receiptImagePath, setReceiptImagePath] = useState(""); // S3に保存された画像のパス（編集時に既存データから読み込んだ画像のパスを保持するため）
  const [receiptImageUrl, setReceiptImageUrl] = useState(""); // 編集時に既存データから読み込んだS3に保存された画像のURL表示用
  const [newReceiptImagePath, setNewReceiptImagePath] = useState(""); // 今回新しく選択・撮影した画像のS3パスを保持するため
  const [titleError, setTitleError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [storeNameError, setStoreNameError] = useState("");
  const paymentMethods = [
    "現金",
    "クレジット",
    "PASMO",
    "楽天Pay",
    "PayPay",
    "J-CoinPay",
    "Amazon Pay",
    "Edy",
    "QR決済",
  ];
  const canSave =
    title.trim() !== "" &&
    amount.trim() !== "" &&
    storeName.trim() !== "" &&
    paymentMethod.trim() !== "";
  const [receiptReadMode, setReceiptReadMode] = useState<"single" | "split">(
    "single",
  );
  const [readModeMenuVisible, setReadModeMenuVisible] = useState(false);
  // ここで日付と時刻を結合してISO 8601形式に変換している
  const formatDateTime = (value: string) => {
    const d = new Date(value);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  // ここでは時刻のみを抽出している
  const formatTime = (value: string) => {
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
  };

  // OCRから利用日が返ってきたときに、既存のtransactionDateの時刻と結合してISO 8601形式に変換している
  const applyOcrTransactionDate = (value?: string | null) => {
    if (!value) return;

    let d: Date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yyyy, mm, dd] = value.split("-").map(Number);
      d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
    } else {
      d = new Date(value);
    }

    if (Number.isNaN(d.getTime())) {
      console.warn("Invalid OCR transactionDate:", value);
      return;
    }

    setTransactionDate(d.toISOString());
  };

  // -----------------------------
  // 画像選択
  // -----------------------------
  const pickImage = async () => {
    try {
      setLoading(true);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("エラー", "画像権限が必要です");

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        quality: 1,
      });

      if (!result.canceled) {
        // -----------------------------
        // 圧縮
        // -----------------------------
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,

          [
            {
              rotate: 0,
            },
            {
              resize: {
                width: 2000,
              },
            },
          ],

          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );

        setImageUri(manipulated.uri);

        // ② ここでアップロード
        const imageKey = await uploadReceiptImage(manipulated.uri);
        setNewReceiptImagePath(imageKey);
        console.log("FETCH START");
        const res = await fetch(
          "https://1q0jg5lg49.execute-api.ap-northeast-1.amazonaws.com/receiptRecognition",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageKey,
            }),
          },
        );
        console.log(res.status);
        console.log("FETCH OK");
        const data = await res.json();

        console.log("OCR結果", data);
        if (!data.ok) {
          Alert.alert("OCR失敗", data.error ?? "解析失敗");
          return;
        }

        if (receiptReadMode === "split") {
          const items = data.data.items ?? [];

          if (!items.length) {
            Alert.alert(
              "明細なし",
              "複数トランザクションに分割できる明細が見つかりませんでした。",
            );
            return;
          }

          navigation.navigate("ExpenseSplitCreate", {
            receiptImagePath: imageKey,
            storeName: data.data.storeName ?? "",
            paymentMethod: paymentMethod || data.data.paymentMethod || "現金",
            transactionDate: data.data.transactionDate ?? transactionDate,
            items: items.map((item: any) => ({
              title: item.title ?? "",
              amount: Number(item.amount ?? 0),
              categoryId: item.categoryId ?? "default",
              description: item.description ?? "",
            })),
          });

          return;
        }
        setTitle(data.data.title ?? "");
        setAmount(String(data.data.amount ?? ""));
        setStoreName(data.data.storeName ?? "");
        setDescription(data.data.description ?? "");

        if (data.data.transactionDate) {
          applyOcrTransactionDate(data.data.transactionDate);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("OCR失敗", "レシート解析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // S3アップロード
  // -----------------------------
  const uploadReceiptImage = async (uri: string) => {
    const response = await fetch(uri);

    const blob = await response.blob();

    const path = `receipt/${Date.now()}.jpg`;

    const result = await uploadData({
      path,
      data: blob,
      options: {
        contentType: "image/jpeg",
      },
    }).result;

    return result.path;
  };

  // -----------------------------
  // カメラ撮影
  // -----------------------------
  const takePhoto = async () => {
    try {
      setLoading(true);

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("エラー", "カメラ権限が必要です");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        exif: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled) {
        // -----------------------------
        // 圧縮
        // -----------------------------
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [
            {
              rotate: 0,
            },
            {
              resize: {
                width: 2000,
              },
            },
          ],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );

        setImageUri(manipulated.uri);

        // S3アップロード
        const imageKey = await uploadReceiptImage(manipulated.uri);
        setNewReceiptImagePath(imageKey);

        // OCR API呼び出し
        const res = await fetch(
          "https://1q0jg5lg49.execute-api.ap-northeast-1.amazonaws.com/receiptRecognition",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageKey,
            }),
          },
        );

        const json = await res.json();

        console.log(JSON.stringify(json, null, 2));
        // OCR失敗
        if (!json.ok) {
          Alert.alert("OCR失敗", json.error ?? "解析失敗");

          return;
        }
        if (receiptReadMode === "split") {
          const items = json.data.items ?? [];

          if (!items.length) {
            Alert.alert(
              "明細なし",
              "複数トランザクションに分割できる明細が見つかりませんでした。",
            );
            return;
          }

          navigation.navigate("ExpenseSplitCreate", {
            receiptImagePath: imageKey,
            storeName: json.data.storeName ?? "",
            paymentMethod: json.data.paymentMethod ?? paymentMethod,
            transactionDate: json.data.transactionDate ?? transactionDate,
            items: items.map((item: any) => ({
              title: item.title ?? "",
              amount: Number(item.amount ?? 0),
              categoryId: item.categoryId ?? "default",
              description: item.description ?? "",
            })),
          });

          return;
        }
        // ★ OCR結果反映（OCR成功時のみ）
        setTitle(json.data.title ?? "");
        setAmount(String(json.data.amount ?? ""));
        setStoreName(json.data.storeName ?? "");
        setDescription(json.data.description ?? "");

        if (json.data.transactionDate) {
          applyOcrTransactionDate(json.data.transactionDate);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("OCR失敗", "レシート解析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // OCR結果を複数明細モードでExpenseSplitCreateに渡す
  // -----------------------------
  const validateForm = () => {
    let valid = true;

    setTitleError("");
    setAmountError("");
    setStoreNameError("");

    if (!title.trim()) {
      setTitleError("件名を入力してください");
      valid = false;
    }

    if (!amount.trim()) {
      setAmountError("金額を入力してください");
      valid = false;
    }

    if (!storeName.trim()) {
      setStoreNameError("店舗名を入力してください");
      valid = false;
    }

    if (!paymentMethod.trim()) {
      valid = false;
    }

    return valid;
  };
  // -----------------------------
  // 登録
  // -----------------------------
  const onCreate = async () => {
    try {
      if (!validateForm()) {
        return;
      }
      const currentUser = await getCurrentUser();

      const amountValue = Number(amount.replace(/,/g, ""));
      if (Number.isNaN(amountValue)) {
        setAmountError("金額は数値で入力してください");
        return;
      }

      setLoading(true);

      // 新しく選択・撮影した画像があればそれを使う
      // なければ既存のレシート画像パスを使う
      const savedReceiptImagePath = newReceiptImagePath || receiptImagePath;

      // -----------------------------
      // Transaction作成(編集の場合は更新)
      // -----------------------------
      if (expenseId) {
        await client.models.Transaction.update(
          {
            id: expenseId,
            title,
            amount: amountValue,
            paymentMethod,
            transactionDate: transactionDate,
            storeName,
            description,
            receiptImage: savedReceiptImagePath, // 既存のreceiptImagePathを使用
          },
          {
            authMode: "userPool",
          },
        );
      } else {
        await client.models.Transaction.create(
          {
            title,
            amount: amountValue,
            type: "expense",
            categoryId: "default",
            paymentMethod,
            transactionDate: transactionDate,
            storeName,
            description,
            receiptImage: savedReceiptImagePath, // 新しく選択・撮影した画像のパスを使用
            userId: currentUser.userId,
          },
          {
            authMode: "userPool",
          },
        );
      }

      Alert.alert("成功", "登録しました");

      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "登録に失敗しました");
      //Alert.alert("エラー", "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // ←ここに追加
  useEffect(() => {
    // -----------------------------
    // 編集モードの場合、既存データをロード
    // -----------------------------
    const loadExpense = async () => {
      if (!expenseId) return;
      try {
        const result = await client.models.Transaction.get(
          { id: expenseId },
          {
            authMode: "userPool",
          },
        );

        const item = result.data;

        if (!item) return;

        setTitle(item.title ?? "");
        setAmount(String(item.amount ?? ""));
        setStoreName(item.storeName ?? "");
        setPaymentMethod(item.paymentMethod ?? "現金");
        setDescription(item.description ?? "");

        if (item.transactionDate) {
          setTransactionDate(new Date(item.transactionDate).toISOString());
        }

        if (item.receiptImage) {
          setReceiptImagePath(item.receiptImage);

          try {
            const imageResult = await getUrl({
              path: item.receiptImage,
            });

            setReceiptImageUrl(imageResult.url.toString());
          } catch (e) {
            console.error("getUrl error:", e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadExpense();
  }, [expenseId]);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 80,
      }}
    >
      <Card>
        <Card.Content>
          {loading && (
            <View
              style={{
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <ActivityIndicator />

              <Text
                style={{
                  marginTop: 8,
                }}
              >
                解析中...
              </Text>
            </View>
          )}

          <TextInput
            label="件名"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (text.trim()) setTitleError("");
            }}
            mode="outlined"
            error={!!titleError}
            style={{
              marginTop: 10,
            }}
          />
          {titleError ? (
            <Text style={{ color: "red", marginTop: 4 }}>{titleError}</Text>
          ) : null}

          <TextInput
            label="金額"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (text.trim()) setAmountError("");
            }}
            keyboardType="numeric"
            mode="outlined"
            error={!!amountError}
            style={{
              marginTop: 10,
            }}
          />
          {amountError ? (
            <Text style={{ color: "red", marginTop: 4 }}>{amountError}</Text>
          ) : null}

          <TextInput
            label="店舗名"
            value={storeName}
            onChangeText={(text) => {
              setStoreName(text);
              if (text.trim()) setStoreNameError("");
            }}
            mode="outlined"
            error={!!storeNameError}
            style={{
              marginTop: 10,
            }}
          />
          {storeNameError ? (
            <Text style={{ color: "red", marginTop: 4 }}>{storeNameError}</Text>
          ) : null}

          <Menu
            visible={paymentMenuVisible}
            onDismiss={() => setPaymentMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setPaymentMenuVisible(true)}
                style={{ marginTop: 10, marginBottom: 12 }}
              >
                支払方法：{paymentMethod || "未選択"}
              </Button>
            }
          >
            {paymentMethods.map((method) => (
              <Menu.Item
                key={method}
                onPress={() => {
                  setPaymentMethod(method);
                  setPaymentMenuVisible(false);
                }}
                title={method}
              />
            ))}
          </Menu>
          {!paymentMethod.trim() ? (
            <Text style={{ color: "red", marginTop: 4 }}>
              支払方法を選択してください
            </Text>
          ) : null}

          <Menu
            visible={readModeMenuVisible}
            onDismiss={() => setReadModeMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setReadModeMenuVisible(true)}
                style={{ marginTop: 10 }}
              >
                読み込み方法：
                {receiptReadMode === "single"
                  ? "1レシート1明細"
                  : "1レシート複数明細"}
              </Button>
            }
          >
            <Menu.Item
              title="1レシート1明細"
              onPress={() => {
                setReceiptReadMode("single");
                setReadModeMenuVisible(false);
              }}
            />
            <Menu.Item
              title="1レシート複数明細"
              onPress={() => {
                setReceiptReadMode("split");
                setReadModeMenuVisible(false);
              }}
            />
          </Menu>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            <Button
              mode="outlined"
              onPress={() => setOpen(true)}
              style={{
                marginTop: 10,
                flex: 1.4,
              }}
            >
              {transactionDate
                ? formatDateTime(transactionDate)
                : "利用日を選択"}
            </Button>
            <TextInput
              label="利用時刻 HH:mm"
              value={formatTime(transactionDate)}
              onChangeText={(text) => {
                const m = text.match(/^(\d{1,2}):(\d{2})$/);
                if (!m) return;

                const hour = Number(m[1]);
                const minute = Number(m[2]);

                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
                const d = new Date(transactionDate);
                d.setHours(Number(m[1]), Number(m[2]), 0, 0);
                setTransactionDate(d.toISOString());
              }}
              mode="outlined"
              style={{ marginTop: 10, flex: 1 }}
              contentStyle={{
                height: 30,
              }}
            />
          </View>
          <DatePickerModal
            locale="ja"
            mode="single"
            visible={open}
            onDismiss={() => setOpen(false)}
            date={transactionDate ? new Date(transactionDate) : undefined}
            onConfirm={(params) => {
              setOpen(false);

              const d = params.date;
              if (!d) return;

              const current = new Date(transactionDate);
              const selected = new Date(d);

              selected.setHours(
                current.getHours(),
                current.getMinutes(),
                current.getSeconds(),
                0,
              );

              setTransactionDate(selected.toISOString());
            }}
          />

          <TextInput
            label="メモ"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            mode="outlined"
            style={{
              marginTop: 10,
            }}
          />

          <Button
            mode="outlined"
            onPress={pickImage}
            style={{
              marginTop: 10,
            }}
          >
            レシート選択
          </Button>

          <Button mode="outlined" onPress={takePhoto} style={{ marginTop: 10 }}>
            カメラ撮影
          </Button>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 300,
                marginTop: 10,
                borderRadius: 8,
              }}
              resizeMode="contain"
            />
          ) : receiptImageUrl ? (
            <Image
              source={{ uri: receiptImageUrl }}
              style={{
                width: "100%",
                height: 240,
                borderRadius: 8,
                marginVertical: 12,
              }}
              resizeMode="contain"
            />
          ) : null}
          {/* 保存ボタン */}
          <Surface
            elevation={4}
            style={{
              alignSelf: "center",
              width: "95%",
              marginTop: 24,
              marginBottom: 60,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <Button
              mode="contained"
              onPress={onCreate}
              disabled={!canSave || loading}
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
                borderRadius: 14,
              }}
            >
              保存
            </Button>
          </Surface>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
