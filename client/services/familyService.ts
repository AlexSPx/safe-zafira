import { apiClient } from './apiClient';
export { ApiError } from './apiClient';

export type GuardedMemberSummary = {
  id: number;
  username: string;
  familyName: string;
};

export type FamilyMemberLocation = {
  x: number;
  y: number;
};

class FamilyApiService {
  getFamilyDashboard(myId: number): Promise<GuardedMemberSummary[]> {
    return apiClient.get<GuardedMemberSummary[]>(`/api/family/all/${myId}`);
  }

  async addGuardianByEmail(
    myId: number,
    email: string,
    privacyLevel: string,
  ): Promise<string> {
    const query = new URLSearchParams({ email, privacyLevel }).toString();
    const response = await apiClient.post<string>(
      `/api/family/${myId}/add-by-email?${query}`,
    );
    return response;
  }

  getFamilyMemberVehicleLocation(
    memberId: number,
  ): Promise<FamilyMemberLocation | null> {
    return apiClient.get<FamilyMemberLocation | null>(
      `/api/vehicles/family/${memberId}/location`,
    );
  }
}

export const familyService = new FamilyApiService();
