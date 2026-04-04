import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Gamepad2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const fileTypeIcons = {
  pdf: FileText,
  image: Image,
  word: FileText,
  slides: FileSpreadsheet,
  text: FileText
};

const statusConfig = {
  pending: { icon: Loader2, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Processing', spin: true },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Ready' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Error' }
};

export default function DocumentCard({ document, onClick, gamesCount = 0 }) {
  const FileIcon = fileTypeIcons[document.file_type] || FileText;
  const status = statusConfig[document.processing_status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card 
      className="p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onClick?.(document)}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
          <FileIcon className="w-6 h-6 text-violet-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate mb-1">{document.title}</h4>
          <p className="text-sm text-gray-500 mb-2">
            {format(new Date(document.created_date), 'MMM d, yyyy')}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={`${status.bg} ${status.color}`}>
              <StatusIcon className={`w-3 h-3 mr-1 ${status.spin ? 'animate-spin' : ''}`} />
              {status.label}
            </Badge>
            
            {document.processing_status === 'completed' && (
              <>
                {gamesCount > 0 && (
                  <Badge variant="outline" className="text-violet-600 border-violet-200">
                    <Gamepad2 className="w-3 h-3 mr-1" />
                    {gamesCount} games
                  </Badge>
                )}
                {document.key_concepts?.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {document.key_concepts.length} concepts
                  </Badge>
                )}
              </>
            )}
            
            {document.grade !== undefined && document.grade !== null && (
              <Badge className="bg-emerald-100 text-emerald-700">
                {document.grade}/{document.max_grade || 100}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}