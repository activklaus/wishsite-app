import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../styles/colors';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return { theme, isDarkMode };
};