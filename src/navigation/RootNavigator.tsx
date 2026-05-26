import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ExpenseCreate from "../screens/ExpenseCreate";
import ExpenseList from "../screens/ExpenseList";
export type RootStackParamList = {
  ExpenseList: undefined;
  ExpenseCreate: undefined;
  Dummy: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ExpenseList">
        <Stack.Screen
          name="ExpenseList"
          component={ExpenseList}
          options={{
            title: "Expense List",
          }}
        />
        <Stack.Screen
          name="ExpenseCreate"
          component={ExpenseCreate}
          options={{
            title: "Expense Create",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
