import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, FileText, Languages } from 'lucide-react';

const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ru', label: 'Russian' }
];

export default function TextMaterialUploader({ classId, onUploadComplete, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [translationLanguage, setTranslationLanguage] = useState('none');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    setProcessing(true);
    try {
      // Extract key concepts and generate summaries
      const analysisPrompt = `Analyze this educational content and provide:
1. Short summary (2-3 sentences)
2. Medium summary (1 paragraph)
3. Detailed summary (2-3 paragraphs)
4. Key concepts with definitions and importance levels

Content:
${content}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary_short: { type: "string" },
            summary_medium: { type: "string" },
            summary_detailed: { type: "string" },
            key_concepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" },
                  importance: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            }
          }
        }
      });

      let finalAnalysis = analysis;

      // Translate if requested
      if (translationLanguage !== 'none') {
        const lang = languageOptions.find(l => l.code === translationLanguage)?.label;
        const translationPrompt = `Translate the following summaries and key concepts to ${lang}:

${JSON.stringify(analysis, null, 2)}

Maintain the same JSON structure.`;

        finalAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: translationPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              summary_short: { type: "string" },
              summary_medium: { type: "string" },
              summary_detailed: { type: "string" },
              key_concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    term: { type: "string" },
                    definition: { type: "string" },
                    importance: { type: "string" }
                  }
                }
              }
            }
          }
        });
      }

      const document = await base44.entities.Document.create({
        class_id: classId,
        title: title.trim(),
        file_type: 'text',
        extracted_text: content,
        summary_short: finalAnalysis.summary_short,
        summary_medium: finalAnalysis.summary_medium,
        summary_detailed: finalAnalysis.summary_detailed,
        key_concepts: finalAnalysis.key_concepts,
        processing_status: 'completed'
      });

      onUploadComplete?.(document);
    } catch (err) {
      console.error('Failed to process text:', err);
    }
    setProcessing(false);
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Add Text Material
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5 Notes"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or type your study material here..."
            className="mt-1 min-h-[200px]"
          />
        </div>

        <div>
          <Label>Translate Summary To (Optional)</Label>
          <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Translation</SelectItem>
              {languageOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-violet-600 hover:bg-violet-700"
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Create Material'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}