import { useCallback, useRef } from 'react';
import type { KeyboardEventHandler } from 'react';
import type { ListEntry } from '../lib/listModels';

interface UseKeyboardOptions {
  item: ListEntry;
  onCreateBelow: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDeleteEmpty: () => void;
  onHeadingCommand: () => void;
}

export function useKeyboard({
  item,
  onCreateBelow,
  onIndent,
  onOutdent,
  onDeleteEmpty,
  onHeadingCommand,
}: UseKeyboardOptions): KeyboardEventHandler<HTMLTextAreaElement> {
  // Keep latest values in a ref so the stable callback always reads fresh state.
  // This avoids stale closures without needing useEffectEvent (still experimental).
  const ref = useRef({ item, onCreateBelow, onIndent, onOutdent, onDeleteEmpty, onHeadingCommand });
  ref.current = { item, onCreateBelow, onIndent, onOutdent, onDeleteEmpty, onHeadingCommand };

  return useCallback((event) => {
    const { item: cur, onCreateBelow, onIndent, onOutdent, onDeleteEmpty, onHeadingCommand } =
      ref.current;

    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (cur.text.trim() === '/h') {
        onHeadingCommand();
        return;
      }
      onCreateBelow();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        onOutdent();
      } else {
        onIndent();
      }
      return;
    }

    if (event.key === 'Backspace' && cur.text === '') {
      event.preventDefault();
      onDeleteEmpty();
    }
  }, []); // stable — reads fresh values via ref
}
