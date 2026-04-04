import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from 'lucide-react';

export default function BackButton({ to = 'Home', label = 'Home', showHomeIcon = true }) {
  return (
    <Link to={createPageUrl(to)}>
      <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
        {showHomeIcon ? <Home className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {label}
      </Button>
    </Link>
  );
}