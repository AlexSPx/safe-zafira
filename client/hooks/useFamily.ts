import { useCallback } from 'react';
import { familyService } from '../services/familyService';
import {
  useFamilyStore,
  setFamilyMembers,
  setFamilyLoading,
  setFamilyError,
} from '../stores/familyStore';

const DEFAULT_PRIVACY_LEVEL = 'FULL';

export function useFamily() {
  const store = useFamilyStore();

  const fetchFamilyDashboard = useCallback(async (myId: number) => {
    setFamilyLoading(true);
    try {
      const members = await familyService.getFamilyDashboard(myId);
      setFamilyMembers(members);
      setFamilyLoading(false);
    } catch (error) {
      setFamilyError(
        error instanceof Error ? error.message : 'Failed to fetch family',
      );
    }
  }, []);

  const addGuardianByEmail = useCallback(
    async (
      myId: number,
      email: string,
      privacyLevel: string = DEFAULT_PRIVACY_LEVEL,
    ) => {
      setFamilyLoading(true);
      try {
        await familyService.addGuardianByEmail(myId, email, privacyLevel);
        await fetchFamilyDashboard(myId);
        setFamilyLoading(false);
      } catch (error) {
        setFamilyError(
          error instanceof Error ? error.message : 'Failed to add guardian',
        );
        throw error;
      }
    },
    [fetchFamilyDashboard],
  );

  return {
    ...store,
    fetchFamilyDashboard,
    addGuardianByEmail,
  };
}
