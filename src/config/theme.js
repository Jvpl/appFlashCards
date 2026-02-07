import { DarkTheme } from '@react-navigation/native';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1A202C', // Cor de fundo principal do seu app
    card: '#2D3748',       // Cor dos cabe�alhos
    text: '#FFFFFF',
    border: 'rgb(30, 30, 30)',
    notification: '#4FD1C5',
  },
};

// Configura��o de transi��o personalizada para suavizar a "sa�da"
// Configura��o de transi��o personalizada para "fade leve" (timing)
export { AppTheme };
export default AppTheme;
