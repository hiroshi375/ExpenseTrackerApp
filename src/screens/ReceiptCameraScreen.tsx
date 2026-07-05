import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CameraCapturedPicture } from "expo-camera";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ReceiptCamera">;

export default function ReceiptCameraScreen({ navigation }: Props) {
    const cameraRef = useRef<CameraView | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [taking, setTaking] = useState(false);

    if (!permission) {
        return (
            <View style={styles.center}>
                <Text>カメラ権限を確認しています...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{ marginBottom: 16 }}>
                    レシート撮影にはカメラ権限が必要です。
                </Text>

                <Button mode="contained" onPress={requestPermission}>
                    カメラ権限を許可
                </Button>
            </View>
        );
    }

    const takePicture = async () => {
        try {
            if (!cameraRef.current || !cameraReady || taking) {
                return;
            }

            setTaking(true);

            const photo: CameraCapturedPicture =
                await cameraRef.current.takePictureAsync({
                    quality: 0.9,
                    exif: true,
                });

            navigation.navigate("ExpenseCreate", {
                capturedImageUri: photo.uri,
                capturedImageWidth: photo.width,
                capturedImageHeight: photo.height,
            });
        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "撮影に失敗しました");
        } finally {
            setTaking(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                mode="picture"
                onCameraReady={() => setCameraReady(true)}
            />

            <View style={styles.footer}>
                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.button}
                >
                    戻る
                </Button>

                <Button
                    mode="contained"
                    onPress={takePicture}
                    disabled={!cameraReady || taking}
                    style={styles.button}
                >
                    {taking ? "撮影中..." : "撮影"}
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    camera: {
        flex: 1,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 50,
        backgroundColor: "#ffffff",
    },
    button: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
});
