import { DarkTheme } from '@react-navigation/native';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F0F0F',
    card: '#0F0F0F',
    text: '#FFFFFF',
    border: 'rgb(30, 30, 30)',
    notification: '#4FD1C5',
  },
};

// Configura��o de transi��o personalizada para suavizar a "sa�da"
// Configura��o de transi��o personalizada para "fade leve" (timing)
export { AppTheme };
export default AppTheme;
