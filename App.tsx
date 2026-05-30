import { withAuthenticator } from "@aws-amplify/ui-react-native";
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import "react-native-get-random-values";
import { Provider as PaperProvider } from "react-native-paper";
import outputs from "./amplify_outputs.json";
import RootNavigator from "./src/navigation/RootNavigator";

Amplify.configure(outputs);

I18n.putVocabularies({
  ja: {
    "Sign in": "サインイン",
    "Sign In": "サインイン",
    "Sign into your account": "アカウントにサインイン",

    "Sign Up": "新規登録",
    "Create Account": "アカウント作成",
    "Create a new account": "新しいアカウントを作成",

    Email: "メールアドレス",
    Username: "ユーザー名",
    Password: "パスワード",
    "Confirm Password": "パスワード確認",

    "Forgot Password?": "パスワードを忘れた場合",
    "Forgot your password?": "パスワードを忘れた場合",
    "Reset Password": "パスワード再設定",
    "Reset your password": "パスワードを再設定",

    "Confirm Sign Up": "登録確認",
    "Confirmation Code": "確認コード",

    "Enter your email": "メールアドレスを入力",
    "Enter your Email": "メールアドレスを入力",
    "Enter your username": "ユーザー名を入力",
    "Enter your password": "パスワードを入力",
    "Enter your Password": "パスワードを入力",
    "Enter your code": "確認コードを入力",

    "Send code": "コードを送信",
    "Send Code": "コードを送信",
    "Back to Sign In": "サインインに戻る",
    "Back to Sign in": "サインインに戻る",
    Confirm: "確認",
    Submit: "送信",
    "Resend code": "コードを再送信",
    "Resend Code": "コードを再送信",
  },
});

I18n.setLanguage("ja");

function App() {
  return (
    <PaperProvider>
      <RootNavigator />
    </PaperProvider>
  );
}

export default withAuthenticator(App);
