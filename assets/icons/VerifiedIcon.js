import React from 'react';
import Svg, { Path } from 'react-native-svg';

const VerifiedIcon = ({ size = 20, color = '#FFFFFF' }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="-2 0 28 24"
      fill="none"
    >
      {/* Wavy Badge Shape - Star/Seal style with 8 points */}
      <Path
        d="M12 2L13.09 4.26L15.5 3.5L15.74 6.01L18.01 6.74L17.24 9.15L19.5 10.24L17.99 12L19.5 13.76L17.24 14.85L18.01 17.26L15.74 17.99L15.5 20.5L13.09 19.74L12 22L10.91 19.74L8.5 20.5L8.26 17.99L5.99 17.26L6.76 14.85L4.5 13.76L6.01 12L4.5 10.24L6.76 9.15L5.99 6.74L8.26 6.01L8.5 3.5L10.91 4.26L12 2Z"
        fill={color}
        fillOpacity="0.9"
      />
      {/* Checkmark */}
      <Path
        d="M8.5 12L10.75 14.25L15.5 9.5"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default VerifiedIcon;
