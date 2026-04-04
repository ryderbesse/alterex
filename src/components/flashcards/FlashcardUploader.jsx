import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, Loader2, FileText, Image, FileType, Type, Languages } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fileTypeIcons = {
  pdf: FileText,
  image: Image,
  word: FileType,
  slides: FileType,
  text: FileText
};

export default function FlashcardUploader({ onClose, classes }) {
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [translationLanguage, setTranslationLanguage] = useState('none');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' }
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, '') + ' - Flashcards');
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, '') + ' - Flashcards');
      }
    }
  };

  const handleGenerate = async () => {
    if ((!file && !textContent.trim()) || !title || !classId) return;

    let content = '';

    if (inputMode === 'file') {
      setUploading(true);
      try {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setUploading(false);
        setProcessing(true);

        // Extract content from file
        const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              content: { type: "string", description: "The full text content of the document" }
            }
          }
        });

        content = extractedData.output?.content || '';
      } catch (err) {
        console.error('Failed to process file:', err);
        setUploading(false);
        setProcessing(false);
        return;
      }
    } else {
      content = textContent.trim();
      setProcessing(true);
    }

    try {
      // Generate flashcards using LLM
      const flashcardData = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following educational content, create comprehensive flashcards for studying. 
Each flashcard should have a clear question on the front and a concise answer on the back.
Create at least 10-15 flashcards covering the key concepts.

Content:
${content}

Generate flashcards that help students learn and memorize the material effectively.`,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  front: { type: "string", description: "The question or term" },
                  back: { type: "string", description: "The answer or definition" },
                  concept: { type: "string", description: "The concept this card covers" }
                }
              }
            }
          }
        }
      });

      let finalFlashcards = flashcardData.flashcards;

      // Translate if requested
      if (translationLanguage !== 'none') {
        const lang = languageOptions.find(l => l.code === translationLanguage)?.label;
        const translationPrompt = `Translate these flashcards to ${lang}. Keep the same structure:

${JSON.stringify(flashcardData.flashcards, null, 2)}`;

        const translated = await base44.integrations.Core.InvokeLLM({
          prompt: translationPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    front: { type: "string" },
                    back: { type: "string" },
                    concept: { type: "string" }
                  }
                }
              }
            }
          }
        });

        finalFlashcards = translated.flashcards;
      }

      // Create flashcard set as a LearningGame
      await base44.entities.LearningGame.create({
        class_id: classId,
        title,
        game_type: 'flashcards',
        flashcards: finalFlashcards?.map((fc, idx) => ({
          ...fc,
          id: fc.id || `fc-${idx}`
        })) || [],
        total_xp: 50
      });

      queryClient.invalidateQueries(['flashcards']);
      queryClient.invalidateQueries(['allGames']);
      onClose();
    } catch (err) {
      console.error('Failed to generate flashcards:', err);
    }
    setUploading(false);
    setProcessing(false);
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Generate Flashcards</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5 Vocabulary"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Input Method</Label>
          <Tabs value={inputMode} onValueChange={setInputMode} className="mt-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="w-4 h-4 mr-2" />
                Enter Text
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {inputMode === 'file' ? (
          <div>
            <Label>Upload Material</Label>
            <div
            className={`mt-1 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('flashcard-file-input').click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-violet-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Drop file here or click to upload</p>
                <p className="text-sm text-gray-400 mt-1">PDF, Word, images, or text files</p>
              </>
            )}
            <input
              id="flashcard-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          </div>
        ) : (
          <div>
            <Label>Text Content</Label>
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste or type your study material here..."
              className="mt-1 min-h-[150px]"
            />
          </div>
        )}

        <div>
          <Label>Translate To (Optional)</Label>
          <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Translation</SelectItem>
              {languageOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <Languages className="w-4 h-4 mr-2 inline" />
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-violet-600 hover:bg-violet-700"
            onClick={handleGenerate}
            disabled={(inputMode === 'file' ? !file : !textContent.trim()) || !title || !classId || uploading || processing}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Flashcards'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}