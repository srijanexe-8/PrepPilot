import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../store/ThemeContext';

/**
 * Header control that flips the app between the light and premium dark themes.
 * Shows the theme it will switch *to*, so the icon reads as the action.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors overflow-hidden"
    >
      {/* Both icons stay mounted and cross-rotate, so the swap reads as one
          continuous motion rather than a swap of two separate glyphs. */}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out motion-reduce:transition-none ${
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      >
        <Moon size={15} />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out motion-reduce:transition-none ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      >
        <Sun size={15} />
      </span>
    </button>
  );
}
