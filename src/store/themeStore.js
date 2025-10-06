import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Theme Store
 * Manages UI theme settings
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      // Current theme: 'ipod' or 'rabbit'
      theme: 'ipod',
      
      // Set theme
      setTheme: (theme) => {
        set({ theme })
        // Apply to document body
        document.body.className = theme
      },
      
      // Toggle between themes
      toggleTheme: () => {
        const current = get().theme
        const newTheme = current === 'ipod' ? 'rabbit' : 'ipod'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'ui-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)