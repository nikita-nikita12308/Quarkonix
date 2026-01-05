/**
 * Language detection and support utilities
 */

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import type { Extension } from '@codemirror/state';

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'unknown';

/**
 * Detect language from file extension
 */
export const detectLanguage = (filename: string): SupportedLanguage => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    default:
      return 'unknown';
  }
};

/**
 * Get CodeMirror language extension for a file
 */
export const getLanguageExtension = (filename: string): Extension => {
  const language = detectLanguage(filename);
  
  switch (language) {
    case 'javascript':
    case 'typescript':
      return javascript({ jsx: true, typescript: true });
    case 'python':
      return python();
    case 'html':
      return html();
    case 'css':
      return css();
    default:
      return javascript({ jsx: true, typescript: true });
  }
};

/**
 * Check if a language is supported
 */
export const isLanguageSupported = (filename: string): boolean => {
  return detectLanguage(filename) !== 'unknown';
};

/**
 * Get a user-friendly language name
 */
export const getLanguageName = (filename: string): string => {
  const language = detectLanguage(filename);
  const names: Record<SupportedLanguage, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    html: 'HTML',
    css: 'CSS',
    unknown: 'Unknown',
  };
  return names[language];
};
