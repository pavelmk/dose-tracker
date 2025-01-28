import { useState, useCallback } from 'react';
import { AppState } from '../types';

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

export const useUndoRedo = (initialState: AppState) => {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const updateState = useCallback((newPresent: AppState) => {
    setState((currentState) => ({
      past: [...currentState.past, currentState.present],
      present: newPresent,
      future: [],
    }));
  }, []);

  return {
    state: state.present,
    undo,
    redo,
    canUndo,
    canRedo,
    updateState,
  };
};
