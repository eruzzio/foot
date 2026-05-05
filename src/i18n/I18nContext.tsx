import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from './translations';
import { supabase } from '../lib/supabase';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.fr;
}

const I18nContext = createContext<I18nContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: translations.fr,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    // Charger la langue depuis localStorage d'abord (rapide)
    const saved = localStorage.getItem('orion_language') as Language;
    if (saved && translations[saved]) setLanguageState(saved);

    // Puis depuis Supabase (synchronisation)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.language) {
        const lang = user.user_metadata.language as Language;
        if (translations[lang]) {
          setLanguageState(lang);
          localStorage.setItem('orion_language', lang);
        }
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('orion_language', lang);
    // Sauvegarder dans le profil
    await supabase.auth.updateUser({ data: { language: lang } });
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
