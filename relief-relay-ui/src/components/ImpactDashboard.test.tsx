import { render, screen } from '@testing-library/react';
import { ImpactDashboard } from './ImpactDashboard';
import { describe, it, expect } from 'vitest';

describe('ImpactDashboard', () => {
  it('renders gracefully when totalCases is 0', () => {
    // Render the component with 0 cases
    render(<ImpactDashboard totalCases={0} />);

    // Assert that metric labels are rendered
    expect(screen.getByText(/People Assisted/i)).toBeInTheDocument();
    expect(screen.getByText(/High-Risk Identified/i)).toBeInTheDocument();
    expect(screen.getByText(/Families Sheltered/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Escalations/i)).toBeInTheDocument();

    // Assert behavioral properties: make sure no NaN, Infinity, or undefined values are displayed
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
