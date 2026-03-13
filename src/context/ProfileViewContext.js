import React, { createContext, useState, useContext } from 'react';

const ProfileViewContext = createContext();

export const ProfileViewProvider = ({ children }) => {
  const [profileVisitor, setProfileVisitor] = useState(null);

  const showProfileViewAlert = (visitor) => {
    setProfileVisitor(visitor);
  };

  const dismissProfileViewAlert = () => {
    setProfileVisitor(null);
  };

  return (
    <ProfileViewContext.Provider
      value={{
        profileVisitor,
        showProfileViewAlert,
        dismissProfileViewAlert,
      }}
    >
      {children}
    </ProfileViewContext.Provider>
  );
};

export const useProfileView = () => {
  const context = useContext(ProfileViewContext);
  if (!context) {
    throw new Error('useProfileView must be used within ProfileViewProvider');
  }
  return context;
};
