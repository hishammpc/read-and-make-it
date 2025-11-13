// Training hours and compliance calculations

interface ProgramAssignment {
  status: string;
  programs: {
    hours: number;
    end_date_time: string;
  };
}

export function calculateTotalHours(assignments: ProgramAssignment[]): number {
  return assignments
    .filter((assignment) => assignment.status === 'Attended')
    .reduce((total, assignment) => total + (assignment.programs?.hours || 0), 0);
}

export function calculateCurrentYearHours(assignments: ProgramAssignment[]): number {
  const currentYear = new Date().getFullYear();
  return assignments
    .filter((assignment) => {
      if (assignment.status !== 'Attended') return false;
      const endDate = new Date(assignment.programs?.end_date_time);
      return endDate.getFullYear() === currentYear;
    })
    .reduce((total, assignment) => total + (assignment.programs?.hours || 0), 0);
}

export function calculateCompliancePercentage(
  completedHours: number,
  targetHours: number = 40
): number {
  if (targetHours === 0) return 0;
  const percentage = (completedHours / targetHours) * 100;
  return Math.min(Math.round(percentage), 100);
}

export function calculateHoursByCategory(assignments: ProgramAssignment[]): Record<string, number> {
  const hoursByCategory: Record<string, number> = {
    Technical: 0,
    Leadership: 0,
    'Soft Skill': 0,
    Mandatory: 0,
    Others: 0,
  };

  assignments
    .filter((assignment) => assignment.status === 'Attended')
    .forEach((assignment) => {
      const category = (assignment.programs as any)?.category || 'Others';
      const hours = assignment.programs?.hours || 0;
      if (hoursByCategory[category] !== undefined) {
        hoursByCategory[category] += hours;
      } else {
        hoursByCategory.Others += hours;
      }
    });

  return hoursByCategory;
}
