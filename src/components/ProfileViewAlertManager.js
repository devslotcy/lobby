import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useProfileView } from '../context/ProfileViewContext';
import ProfileViewAlert from './ProfileViewAlert';

export default function ProfileViewAlertManager() {
  const navigation = useNavigation();
  const { profileVisitor, dismissProfileViewAlert } = useProfileView();

  if (!profileVisitor) {
    return null;
  }

  const handlePress = (visitor) => {
    navigation.navigate('UserProfileView', {
      userId: visitor.id,
      user: visitor
    });
  };

  return (
    <ProfileViewAlert
      visitor={profileVisitor}
      onDismiss={dismissProfileViewAlert}
      onPress={handlePress}
    />
  );
}
