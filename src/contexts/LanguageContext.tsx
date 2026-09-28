import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ms, type Dictionary } from '@/i18n/ms';
import { en } from '@/i18n/en';

export type Language = 'ms' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Dictionary for the current language — read strings as `t.nav.dashboard`. */
  t: Dictionary;
}

const dictionaries: Record<Language, Dictionary> = { ms, en };
const LANGUAGE_KEY = 'mylearning_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'ms';
  } catch {
    return 'ms';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the choice just won't persist.
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: dictionaries[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
