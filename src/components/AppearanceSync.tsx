import { useEffect } from "react";
import { useAppearance } from "@/store/admin-store";

const fontStack = (font: string, fallback: string) => `"${font}", ${fallback}`;

export function AppearanceSync() {
  const appearance = useAppearance();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", appearance.primary);
    root.style.setProperty("--secondary", appearance.secondary);
    root.style.setProperty("--background", appearance.background);
    root.style.setProperty("--button-color", appearance.buttonColor);
    root.style.setProperty("--radius", `${appearance.radius}rem`);
    root.style.setProperty(
      "--font-display-family",
      fontStack(appearance.fontDisplay, '"Manrope", ui-sans-serif, system-ui, sans-serif'),
    );
    root.style.setProperty(
      "--font-sans-family",
      fontStack(appearance.fontSans, '"Inter", ui-sans-serif, system-ui, sans-serif'),
    );
  }, [appearance]);

  return null;
}
