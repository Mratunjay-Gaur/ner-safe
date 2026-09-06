import { CalculatedRiskAssessment, RiskAiExplanation } from '../types/risk';
import { safeFetchJson } from '../utils/safeFetch';

export async function fetchRiskAiExplanation(
  assessment: CalculatedRiskAssessment
): Promise<RiskAiExplanation> {
  try {
    const { ok, data, error } = await safeFetchJson<RiskAiExplanation>('/api/risk/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: assessment.location,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        factors: assessment.factors,
        forecastWindows: assessment.forecastWindows,
        dataCompleteness: assessment.dataCompleteness,
      }),
    });

    if (!ok || !data) {
      return {
        available: false,
        message: error || 'Unable to retrieve AI explanation.',
      };
    }

    return data;
  } catch (err: any) {
    return {
      available: false,
      message: err.message || 'Unable to connect to AI explanation service.',
    };
  }
}
