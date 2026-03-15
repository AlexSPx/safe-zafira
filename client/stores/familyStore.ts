import { useSyncExternalStore } from 'react';
import type { GuardedMemberSummary } from '../services/familyService';

type FamilyState = {
  members: GuardedMemberSummary[];
  isLoading: boolean;
  error: string | null;
};

let state: FamilyState = {
  members: [],
  isLoading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFamilyStore(): FamilyState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function setFamilyMembers(members: GuardedMemberSummary[]) {
  state = { ...state, members, error: null };
  notifyListeners();
}

export function setFamilyLoading(isLoading: boolean) {
  state = { ...state, isLoading };
  notifyListeners();
}

export function setFamilyError(error: string | null) {
  state = { ...state, error, isLoading: false };
  notifyListeners();
}

export function clearFamilyStore() {
  state = {
    members: [],
    isLoading: false,
    error: null,
  };
  notifyListeners();
}

export function getFamilyStore(): FamilyState {
  return state;
}
