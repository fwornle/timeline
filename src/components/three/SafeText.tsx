import React from 'react';
import { Text } from '@react-three/drei';
import type { TextProps } from '@react-three/drei';

interface SafeTextProps extends TextProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A safe wrapper around @react-three/drei Text component that handles font errors gracefully
 */
export const SafeText: React.FC<SafeTextProps> = ({ children, fallback = null, ...props }) => {
  try {
    return (
      <Text
        {...props}
        // Use a simple font configuration to avoid OPUS table errors
        font={undefined} // Let drei use its default font
        // Remove any problematic font properties
        fontWeight={undefined}
      >
        {children}
      </Text>
    );
  } catch (error) {
    console.warn('SafeText: Font rendering error, using fallback', error);
    return fallback as React.ReactElement;
  }
};
