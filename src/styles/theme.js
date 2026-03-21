// src/styles/theme.js

// Apple-style minimal dark theme color system
// Exported for reference, usage in JavaScript logic, or charts/graphs
export const theme = {
  colors: {
    // True black ambient background like iOS dark mode
    background: '#000000',
    
    // Elevated card background slightly lighter
    card: '#1C1C1E',
    
    // Default primary (blue commonly used in crisp UIs)
    primary: '#0A84FF',
    
    // High-contrast primary text
    text: '#F5F5F7',
    
    // Subtitle text color
    textSecondary: '#8E8E93',
  },
  
  // Example standard spacing system (4px baseline)
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  
  // Apple-style extremely rounded borders
  borderRadius: {
    base: '12px',
    large: '24px',
    full: '9999px'
  }
};
