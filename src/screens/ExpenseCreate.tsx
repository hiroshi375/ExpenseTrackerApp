import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { uploadData } from "aws-amplify/storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
  TextInput,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import type { Schema } from "../../amplify/data/resource";
import type { RootStackParamList } from "../navigation/RootNavigator";
const client = generateClient<Schema>();

export default function ExpenseCreate() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "ExpenseCreate">
    >();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionDate, setTransactionDate] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);

  // -----------------------------
  // 画像選択
  // -----------------------------
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

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
              width: 1280,
            },
          },
        ],

        {
          compress: 0.2,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      setImageUri(manipulated.uri);

      // ② ここでアップロード
      const imageKey = await uploadReceiptImage(manipulated.uri);
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
                width: 1280,
              },
            },
          ],
          {
            compress: 0.2,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );

        setImageUri(manipulated.uri);

        // S3アップロード
        const imageKey = await uploadReceiptImage(manipulated.uri);

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
        // ★ OCR結果反映（OCR成功時のみ）
        setTitle(json.data.title ?? "");

        setAmount(String(json.data.amount ?? ""));

        setStoreName(json.data.storeName ?? "");

        setDescription(json.data.description ?? "");

        if (json.data.transactionDate) {
          setTransactionDate(new Date(json.data.transactionDate));
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
  // 登録
  // -----------------------------
  const onCreate = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!title.trim()) {
        Alert.alert("エラー", "タイトルを入力してください");

        return;
      }

      if (!amount.trim()) {
        Alert.alert("エラー", "金額を入力してください");

        return;
      }

      setLoading(true);

      let receiptImage = "";

      // -----------------------------
      // S3アップロード
      // -----------------------------
      if (imageUri) {
        receiptImage = await uploadReceiptImage(imageUri);
      }

      // -----------------------------
      // Transaction作成
      // -----------------------------
      await client.models.Transaction.create(
        {
          title,
          amount: Number(amount),
          type: "expense",
          categoryId: "default",
          paymentMethod: "cash",
          transactionDate: (transactionDate ?? new Date()).toISOString(),
          storeName,
          description,
          receiptImage,
          userId: currentUser.userId,
        },

        {
          authMode: "userPool",
        },
      );

      Alert.alert("成功", "登録しました");

      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert("OCR失敗", "レシート解析に失敗しました");
      //Alert.alert("エラー", "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // スタイル
  // -----------------------------
  const styles = StyleSheet.create({
    cameraGuide: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    frame: {
      width: 280,
      height: 400,
      borderWidth: 2,
      borderColor: "white",
      borderRadius: 12,
      opacity: 0.6,
    },
  });

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      {/* ★ここに追加（カメラガイド） */}
      <View style={styles.cameraGuide}>
        <View style={styles.frame} />
      </View>

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
          <Text variant="titleLarge">Expense Create</Text>

          <TextInput
            label="件名"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={{
              marginTop: 10,
            }}
          />

          <TextInput
            label="金額"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            style={{
              marginTop: 10,
            }}
          />

          <TextInput
            label="店舗名"
            value={storeName}
            onChangeText={setStoreName}
            mode="outlined"
            style={{
              marginTop: 10,
            }}
          />

          <TextInput
            label="支払い方法"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            mode="outlined"
            style={{
              marginTop: 10,
            }}
          />
          <Button
            mode="outlined"
            onPress={() => setOpen(true)}
            style={{
              marginTop: 10,
            }}
          >
            {transactionDate
              ? transactionDate.toLocaleDateString()
              : "利用日を選択"}
          </Button>

          <DatePickerModal
            locale="ja"
            mode="single"
            visible={open}
            onDismiss={() => setOpen(false)}
            date={transactionDate ?? undefined}
            onConfirm={(params) => {
              setOpen(false);

              const d = params.date;
              if (!d) return;

              setTransactionDate(new Date(d));
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
          {imageUri && (
            <Image
              source={{
                uri: imageUri,
              }}
              style={{
                width: "100%",
                height: 300,
                marginTop: 10,
              }}
            />
          )}

          <Button
            mode="contained"
            onPress={onCreate}
            loading={loading}
            style={{
              marginTop: 20,
            }}
          >
            保存
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
