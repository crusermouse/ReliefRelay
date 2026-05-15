import { describe, it, expect } from 'vitest';
import { getPdfUrl } from './api';

const expectedBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

describe('getPdfUrl', () => {
  it('generates the correct URL for a standard alphanumeric case ID', () => {
    const caseId = 'abc123XYZ';
    const result = getPdfUrl(caseId);
    expect(result).toBe(`${expectedBase}/export/${caseId}/pdf`);
  });

  it('generates the correct URL for a case ID with hyphens', () => {
    const caseId = '123e4567-e89b-12d3-a456-426614174000';
    const result = getPdfUrl(caseId);
    expect(result).toBe(`${expectedBase}/export/${caseId}/pdf`);
  });

  it('handles an empty string case ID', () => {
    const caseId = '';
    const result = getPdfUrl(caseId);
    // Based on the implementation `${API}/export/${caseId}/pdf`,
    // it outputs `http://localhost:8000/export//pdf`
    expect(result).toBe(`${expectedBase}/export//pdf`);
  });

  it('handles malformed or special-character case IDs without throwing', () => {
    // Documenting current behavior: special characters are not URI encoded by the function itself.
    // The utility just performs string concatenation.
    const caseId = 'invalid/id?with=special&chars#';
    const result = getPdfUrl(caseId);
    expect(result).toBe(`${expectedBase}/export/${caseId}/pdf`);
  });
});
