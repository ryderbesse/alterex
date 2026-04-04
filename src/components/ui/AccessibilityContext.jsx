import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const defaultPreferences = {
  font_size: 'medium',
  high_contrast: false,
  dark_mode: false,  // Default to light mode
  reduced_motion: false,
  text_to_speech: false
};

const AccessibilityContext = createContext({
  preferences: defaultPreferences,
  updatePreference: () => {},
  fontSizeClass: 'text-base',
  speak: () => {},
  stopSpeaking: () => {},
  loading: false,
  disabilities: []
});

export function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState({
    font_size: 'medium',
    high_contrast: false,
    dark_mode: false,  // Default to light mode
    reduced_motion: false,
    text_to_speech: false
  });
  const [disabilities, setDisabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const progress = await base44.entities.UserProgress.list();
      if (progress.length > 0 && progress[0].preferences) {
        setPreferences(prev => ({ ...prev, ...progress[0].preferences }));
      }
      
      // Load disabilities from UserProfile
      const profiles = await base44.entities.UserProfile.list();
      if (profiles.length > 0 && profiles[0].disabilities) {
        setDisabilities(profiles[0].disabilities);
      }
    } catch (e) {
      console.log('No preferences found');
    }
    setLoading(false);
  };

  const updatePreference = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    try {
      const progress = await base44.entities.UserProgress.list();
      if (progress.length > 0) {
        await base44.entities.UserProgress.update(progress[0].id, { preferences: newPrefs });
      } else {
        await base44.entities.UserProgress.create({ preferences: newPrefs });
      }
    } catch (e) {
      console.log('Failed to save preferences');
    }
  };

  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  }[preferences.font_size] || 'text-base';

  const speak = (text) => {
    if (preferences.text_to_speech && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Apply disability-specific styles
  const dyslexiaMode = disabilities.includes('Dyslexia');
  const adhdMode = disabilities.includes('ADHD');
  const processingMode = disabilities.includes('Processing Difficulties');

  return (
    <AccessibilityContext.Provider value={{
      preferences,
      updatePreference,
      fontSizeClass,
      speak,
      stopSpeaking,
      loading,
      disabilities,
      dyslexiaMode,
      adhdMode,
      processingMode
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
  }

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    return {
      preferences: defaultPreferences,
      updatePreference: () => {},
      fontSizeClass: 'text-base',
      speak: () => {},
      stopSpeaking: () => {},
      loading: false,
      disabilities: [],
      dyslexiaMode: false,
      adhdMode: false,
      processingMode: false
    };
  }
  return context;
};