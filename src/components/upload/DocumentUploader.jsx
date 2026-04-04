import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image, FileSpreadsheet, Loader2, X, CheckCircle2, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

const fileTypeIcons = {
  pdf: FileText,
  image: Image,
  word: FileText,
  slides: FileSpreadsheet,
  text: FileText
};

export default function DocumentUploader({ classId, onUploadComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const getFileType = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['ppt', 'pptx'].includes(ext)) return 'slides';
    return 'text';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    
    setUploading(true);
    setError(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      const fileType = getFileType(file);
      const document = await base44.entities.Document.create({
        class_id: classId,
        title,
        file_url,
        file_type: fileType,
        processing_status: 'processing'
      });

      setUploading(false);
      setProcessing(true);

      // Extract and process content using LLM with vision for all file types
      let extractedData = { output: { extracted_text: '', key_concepts: [] } };
      
      // Use LLM with file_urls for all document types (images, PDFs, etc.)
      const extractionResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all text content and key concepts from this document/image. 
        
Analyze the content thoroughly and identify:
1. All readable text content
2. Key concepts, terms, and definitions
3. Important information

If the image/document contains handwritten text, do your best to transcribe it. If text is illegible, note what you can read.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            extracted_text: { type: "string", description: "Full text content extracted from the document" },
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
            },
            is_legible: { type: "boolean", description: "Whether the text was readable" },
            legibility_notes: { type: "string", description: "Notes about any illegible portions" }
          }
        }
      });
      
      extractedData.output = extractionResult;
      
      // Check if content was illegible
      if (extractionResult.is_legible === false && !extractionResult.extracted_text) {
        setError('Unable to read the document. Please try a clearer image or higher quality scan.');
        setUploading(false);
        setProcessing(false);
        await base44.entities.Document.delete(document.id);
        return;
      }

      // Generate summaries
      const summaryResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this educational content, create three summaries of different lengths. 
        
Content: ${extractedData.output?.extracted_text || 'Unable to extract text'}

Key concepts: ${JSON.stringify(extractedData.output?.key_concepts || [])}

Create:
1. A short summary (2-3 sentences)
2. A medium summary (1 paragraph)  
3. A detailed summary (comprehensive overview)`,
        response_json_schema: {
          type: "object",
          properties: {
            summary_short: { type: "string" },
            summary_medium: { type: "string" },
            summary_detailed: { type: "string" }
          }
        }
      });

      // Update document with processed content
      await base44.entities.Document.update(document.id, {
        extracted_text: extractedData.output?.extracted_text,
        key_concepts: extractedData.output?.key_concepts,
        summary_short: summaryResult.summary_short,
        summary_medium: summaryResult.summary_medium,
        summary_detailed: summaryResult.summary_detailed,
        processing_status: 'completed'
      });

      onUploadComplete?.({ ...document, ...summaryResult });
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to process document. Please try again.');
      setUploading(false);
      setProcessing(false);
    }
  };

  const FileIcon = file ? fileTypeIcons[getFileType(file)] : FileText;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Study Material</h3>
      
      {!processing ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${
              dragOver ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 
              file ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' :
              'border-gray-300 dark:border-gray-600 hover:border-violet-300'
            }`}
          >
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium mb-1">Drop your file here or tap to browse</p>
                  <p className="text-sm text-gray-500 mb-3">
                    PDF, Word, PowerPoint, or images
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                  />
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Browse Files
                    </Button>
                    <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                      <Camera className="w-4 h-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Notes"
                className="mt-1"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-violet-600 hover:bg-violet-700" 
                onClick={handleUpload}
                disabled={!file || !title || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-violet-500 mx-auto mb-4 animate-spin" />
          <h4 className="font-semibold mb-2">Processing Your Document</h4>
          <p className="text-sm text-gray-500">
            Extracting content and generating learning materials...
          </p>
        </div>
      )}
    </Card>
  );
}