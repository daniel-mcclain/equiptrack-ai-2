import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStats } from '../UserStats';
import { useUserStats } from '../../../hooks/useUsers';

// Mock the useUserStats hook
vi.mock('../../../hooks/useUsers', () => ({
  useUserStats: vi.fn()
}));

describe('UserStats', () => {
  it('renders loading state', () => {
    vi.mocked(useUserStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    });

    render(<UserStats />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useUserStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load stats')
    });

    render(<UserStats />);
    expect(screen.getByText(/Error loading user statistics/i)).toBeInTheDocument();
  });

  it('renders stats correctly', () => {
    const mockStats = {
      totalUsers: 100,
      activeUsers: 80,
      inactiveUsers: 15,
      suspendedUsers: 5,
      newUsersThisMonth: 10,
      loginActivity: [
        { date: '2024-03-01', count: 50 },
        { date: '2024-03-02', count: 45 }
      ],
      roleDistribution: [
        { role: 'admin', count: 10 },
        { role: 'user', count: 90 }
      ],
      departmentDistribution: [
        { department: 'IT', count: 30 },
        { department: 'HR', count: 20 }
      ]
    };

    vi.mocked(useUserStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null
    });

    render(<UserStats />);

    expect(screen.getByText('100')).toBeInTheDocument(); // Total Users
    expect(screen.getByText('80')).toBeInTheDocument(); // Active Users
    expect(screen.getByText('15')).toBeInTheDocument(); // Inactive Users
    expect(screen.getByText('5')).toBeInTheDocument(); // Suspended Users

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });
});