/**
 * Centralized keyboard shortcuts management for the editor
 */

import React from 'react';

type KeyHandler = () => void;

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  description: string;
}

class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private enabled = true;

  /**
   * Register a keyboard shortcut
   */
  register(config: ShortcutConfig) {
    const keyCombo = this.getKeyCombo(config);
    this.shortcuts.set(keyCombo, config);
  }

  /**
   * Generate a unique key combination string
   */
  private getKeyCombo(config: ShortcutConfig): string {
    const parts: string[] = [];
    if (config.ctrl) parts.push('Ctrl');
    if (config.shift) parts.push('Shift');
    if (config.alt) parts.push('Alt');
    parts.push(config.key.toUpperCase());
    return parts.join('+');
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event: KeyboardEvent) {
    if (!this.enabled) return;

    for (const [, config] of this.shortcuts) {
      if (
        event.key.toUpperCase() === config.key.toUpperCase() &&
        (config.ctrl ?? false) === event.ctrlKey &&
        (config.shift ?? false) === event.shiftKey &&
        (config.alt ?? false) === event.altKey
      ) {
        event.preventDefault();
        config.handler();
        break;
      }
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Clear all shortcuts
   */
  clear() {
    this.shortcuts.clear();
  }
}

export const shortcutManager = new KeyboardShortcutManager();

/**
 * Hook for using keyboard shortcuts in components
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  deps: unknown[] = []
) {
  const handleKeyDown = (event: KeyboardEvent) => {
    shortcutManager.handleKeyDown(event);
  };

  // Register shortcuts
  React.useEffect(() => {
    shortcuts.forEach(config => shortcutManager.register(config));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      shortcuts.forEach(config => {
        const keyCombo = [
          config.ctrl ? 'Ctrl' : '',
          config.shift ? 'Shift' : '',
          config.alt ? 'Alt' : '',
          config.key.toUpperCase(),
        ]
          .filter(Boolean)
          .join('+');
        // You might want to unregister individual shortcuts instead
      });
    };
  }, deps);
}
