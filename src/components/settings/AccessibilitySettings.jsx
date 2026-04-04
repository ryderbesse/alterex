import React from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import { Type, Contrast, Moon, Sparkles, Volume2 } from 'lucide-react';

export default function AccessibilitySettings() {
  const { preferences, updatePreference } = useAccessibility();

  const settings = [
    {
      id: 'font_size',
      icon: Type,
      label: 'Text Size',
      description: 'Adjust the size of text throughout the app',
      type: 'select',
      options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'xlarge', label: 'Extra Large' }
      ]
    },
    {
      id: 'high_contrast',
      icon: Contrast,
      label: 'High Contrast',
      description: 'Increase contrast for better visibility',
      type: 'switch'
    },
    {
      id: 'dark_mode',
      icon: Moon,
      label: 'Light Mode',
      description: 'Use light theme (default is dark)',
      type: 'switch',
      inverted: true
    },
    {
      id: 'reduced_motion',
      icon: Sparkles,
      label: 'Reduce Motion',
      description: 'Minimize animations and transitions',
      type: 'switch'
    },
    {
      id: 'text_to_speech',
      icon: Volume2,
      label: 'Text to Speech',
      description: 'Read content aloud automatically',
      type: 'switch'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Accessibility</h3>
      
      {settings.map((setting) => {
        const Icon = setting.icon;
        return (
          <Card key={setting.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-violet-600" />
              </div>
              
              <div className="flex-1">
                <Label className="font-medium">{setting.label}</Label>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>

              {setting.type === 'switch' ? (
                <Switch
                  checked={setting.inverted ? !preferences[setting.id] : preferences[setting.id]}
                  onCheckedChange={(checked) => updatePreference(setting.id, setting.inverted ? !checked : checked)}
                />
              ) : (
                <Select
                  value={preferences[setting.id]}
                  onValueChange={(value) => updatePreference(setting.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {setting.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}