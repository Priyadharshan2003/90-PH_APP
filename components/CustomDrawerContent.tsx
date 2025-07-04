// components/CustomDrawerContent.tsx
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>My App</Text>
      </View>
      
      {/* Default items */}
      {props.state.routes.map((route, index) => {
        const { options } = props.descriptors[route.key];
        const label = options.drawerLabel ?? route.name;
        
        return (
          <DrawerItem
            key={route.key}
            label={label}
            icon={options.drawerIcon}
            onPress={() => props.navigation.navigate(route.name)}
          />
        );
      })}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});