#!/bin/bash

FILES=(
  "src/screens/DiscoveryScreen.js"
  "src/screens/MatchesScreen.js"
  "src/screens/ProfileScreen.js"
  "src/screens/EditProfileScreen.js"
  "src/screens/ChatScreen.js"
  "src/screens/LoginScreen.js"
  "src/screens/SignupScreen.js"
  "src/screens/WelcomeScreen.js"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    sed -i '' "s/import { SafeAreaView } from 'react-native';/import { SafeAreaView } from 'react-native-safe-area-context';/g" "$file"
    sed -i '' 's/<SafeAreaView style={styles\.container}>/<SafeAreaView style={styles.container} edges={\["top", "left", "right"\]}>/g' "$file"
    echo "✅ Fixed: $file"
  fi
done

echo "✅ All screens updated!"
