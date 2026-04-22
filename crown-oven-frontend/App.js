import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";

export default function App() {
  const [RealApp, setRealApp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    import("./src/RealApp")
      .then((mod) => setRealApp(() => mod.default))
      .catch((e) => setError(e));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A1A", padding: 20 }}>
        <Text style={{ color: "red", fontSize: 16 }}>Error: {error.toString()}</Text>
      </View>
    );
  }

  if (!RealApp) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A1A" }}>
        <ActivityIndicator size="large" color="#DAA520" />
        <Text style={{ color: "#DAA520", marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return <RealApp />;
}
