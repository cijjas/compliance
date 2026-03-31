export { RiskScoringModule } from './risk-scoring.module';
export { RiskAssessmentService } from './risk-assessment.service';
export type {
  RiskAssessment,
  RiskInput,
  RiskPolicySnapshot,
} from './risk-assessment.policy';
export {
  REQUIRED_DOCUMENT_TYPES,
  calculateRiskAssessment,
} from './risk-assessment.policy';
