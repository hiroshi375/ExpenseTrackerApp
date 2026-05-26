import { withAuthenticator } from "@aws-amplify/ui-react-native";
import { Amplify } from "aws-amplify";
import "react-native-get-random-values";
import { Provider as PaperProvider } from "react-native-paper";
import outputs from "./amplify_outputs.json";
import RootNavigator from "./src/navigation/RootNavigator";

Amplify.configure(outputs);

function App() {
  return (
    <PaperProvider>
      <RootNavigator />
    </PaperProvider>
  );
}

export default withAuthenticator(App);
