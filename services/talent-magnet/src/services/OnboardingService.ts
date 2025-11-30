import { v4 as uuidv4 } from 'uuid';
import { TalentProfile, OnboardingPlan, SkillLevel } from '../models/types.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('OnboardingService');

interface OnboardingPhase {
  name: string;
  duration: string;
  tasks: OnboardingTask[];
}

interface OnboardingTask {
  title: string;
  description: string;
  dueDate?: Date;
  completed: boolean;
  resources?: string[];
}

interface UpskillingSuggestion {
  skill: string;
  currentLevel: string;
  targetLevel: string;
  resources: string[];
  estimatedDuration: string;
}

const STANDARD_PHASES: OnboardingPhase[] = [
  {
    name: 'Pre-arrival',
    duration: '2-4 weeks',
    tasks: [
      {
        title: 'Visa and documentation',
        description: 'Complete visa application and gather required documents',
        completed: false,
        resources: ['https://workinestonia.com/visa'],
      },
      {
        title: 'Housing arrangement',
        description: 'Secure temporary or permanent housing',
        completed: false,
        resources: ['https://kv.ee', 'https://city24.ee'],
      },
      {
        title: 'Bank account setup',
        description: 'Open Estonian bank account (can be done remotely for e-Residents)',
        completed: false,
        resources: ['https://e-resident.gov.ee/banking'],
      },
    ],
  },
  {
    name: 'First Week',
    duration: '1 week',
    tasks: [
      {
        title: 'ID card registration',
        description: 'Register for Estonian ID card at police station',
        completed: false,
      },
      {
        title: 'Network introduction',
        description: 'Meet assigned mentor and key contacts',
        completed: false,
      },
      {
        title: 'Workspace setup',
        description: 'Set up at co-working space or office',
        completed: false,
        resources: ['https://lift99.co', 'https://workland.ee'],
      },
    ],
  },
  {
    name: 'First Month',
    duration: '3 weeks',
    tasks: [
      {
        title: 'Language basics',
        description: 'Enroll in Estonian language course',
        completed: false,
        resources: ['https://integratsioon.ee'],
      },
      {
        title: 'Professional registration',
        description: 'Complete professional certifications/registrations if required',
        completed: false,
      },
      {
        title: 'Community integration',
        description: 'Attend tech community events',
        completed: false,
        resources: ['https://garage48.org', 'https://meetup.com/estonia-tech'],
      },
    ],
  },
  {
    name: 'First Quarter',
    duration: '2 months',
    tasks: [
      {
        title: 'Project kickoff',
        description: 'Begin primary project or role responsibilities',
        completed: false,
      },
      {
        title: 'Performance baseline',
        description: 'Establish goals and metrics for first year',
        completed: false,
      },
      {
        title: 'Feedback session',
        description: 'First formal feedback with mentor',
        completed: false,
      },
    ],
  },
];

const UPSKILLING_RESOURCES: Record<string, string[]> = {
  'machine-learning': [
    'https://course.fast.ai',
    'https://www.coursera.org/specializations/deep-learning',
  ],
  'cloud-computing': [
    'https://aws.amazon.com/training',
    'https://cloud.google.com/training',
  ],
  'cybersecurity': [
    'https://www.sans.org/cyber-security-courses',
    'https://academy.hackthebox.com',
  ],
  'blockchain': [
    'https://www.blockchain-council.org',
    'https://cryptozombies.io',
  ],
  'data-science': [
    'https://www.datacamp.com',
    'https://www.kaggle.com/learn',
  ],
  leadership: [
    'https://www.coursera.org/specializations/leading-teams',
    'https://hbr.org/topic/leadership',
  ],
};

export class OnboardingService {
  /**
   * Generate personalized onboarding plan
   */
  generatePlan(talent: TalentProfile): OnboardingPlan {
    const phases = this.customizePhases(talent);
    const upskillingSuggestions = this.generateUpskillingSuggestions(talent);

    const plan: OnboardingPlan = {
      id: uuidv4(),
      talentId: talent.id,
      phases,
      upskillingSuggestions,
      createdAt: new Date(),
    };

    logger.info(
      {
        talentId: talent.id,
        phaseCount: phases.length,
        upskillingSuggestionCount: upskillingSuggestions.length,
      },
      'Onboarding plan generated',
    );

    return plan;
  }

  /**
   * Update task completion status
   */
  updateTaskStatus(
    plan: OnboardingPlan,
    phaseName: string,
    taskTitle: string,
    completed: boolean,
  ): OnboardingPlan {
    const updatedPhases = plan.phases.map((phase) => {
      if (phase.name !== phaseName) return phase;

      return {
        ...phase,
        tasks: phase.tasks.map((task) => {
          if (task.title !== taskTitle) return task;
          return { ...task, completed };
        }),
      };
    });

    return { ...plan, phases: updatedPhases };
  }

  /**
   * Calculate onboarding progress
   */
  calculateProgress(plan: OnboardingPlan): {
    overall: number;
    byPhase: Record<string, number>;
  } {
    const byPhase: Record<string, number> = {};
    let totalTasks = 0;
    let completedTasks = 0;

    for (const phase of plan.phases) {
      const phaseTotal = phase.tasks.length;
      const phaseCompleted = phase.tasks.filter((t) => t.completed).length;
      byPhase[phase.name] =
        phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;
      totalTasks += phaseTotal;
      completedTasks += phaseCompleted;
    }

    return {
      overall:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      byPhase,
    };
  }

  private customizePhases(talent: TalentProfile): OnboardingPhase[] {
    const phases = JSON.parse(JSON.stringify(STANDARD_PHASES)) as OnboardingPhase[];
    const startDate = new Date();
    let dayOffset = 0;

    // Customize based on talent profile
    for (const phase of phases) {
      // Add due dates
      for (const task of phase.tasks) {
        dayOffset += 3; // Spread tasks
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + dayOffset);
        task.dueDate = dueDate;
      }

      // Add specialized tasks based on signals
      if (
        phase.name === 'First Week' &&
        talent.signals.some((s) => s.category === 'open_source')
      ) {
        phase.tasks.push({
          title: 'Open source community intro',
          description: 'Connect with Estonian open source community',
          completed: false,
          resources: ['https://github.com/estonian-oss'],
        });
      }

      if (
        phase.name === 'First Month' &&
        talent.signals.some((s) => s.category === 'publications')
      ) {
        phase.tasks.push({
          title: 'Research collaboration setup',
          description: 'Connect with University of Tartu or TalTech research groups',
          completed: false,
          resources: ['https://ut.ee', 'https://taltech.ee'],
        });
      }
    }

    // Skip visa phase for EU citizens
    if (['EU', 'EEA', 'Estonian'].includes(talent.nationality || '')) {
      const preArrival = phases.find((p) => p.name === 'Pre-arrival');
      if (preArrival) {
        preArrival.tasks = preArrival.tasks.filter(
          (t) => !t.title.toLowerCase().includes('visa'),
        );
      }
    }

    return phases;
  }

  private generateUpskillingSuggestions(
    talent: TalentProfile,
  ): UpskillingSuggestion[] {
    const suggestions: UpskillingSuggestion[] = [];

    for (const skill of talent.skills) {
      // Suggest upskilling for intermediate skills
      if (
        skill.level === SkillLevel.INTERMEDIATE ||
        skill.level === SkillLevel.ADVANCED
      ) {
        const targetLevel =
          skill.level === SkillLevel.INTERMEDIATE
            ? SkillLevel.ADVANCED
            : SkillLevel.EXPERT;

        const categoryKey = skill.category.toLowerCase().replace(/\s+/g, '-');
        const resources = UPSKILLING_RESOURCES[categoryKey] || [
          'https://www.coursera.org',
          'https://www.udemy.com',
        ];

        suggestions.push({
          skill: skill.name,
          currentLevel: skill.level,
          targetLevel,
          resources,
          estimatedDuration:
            skill.level === SkillLevel.INTERMEDIATE ? '3-6 months' : '6-12 months',
        });
      }
    }

    // Add high-demand skill suggestions
    const existingSkills = new Set(
      talent.skills.map((s) => s.name.toLowerCase()),
    );
    const highDemandSkills = ['machine-learning', 'cloud-computing', 'cybersecurity'];

    for (const demandSkill of highDemandSkills) {
      if (!existingSkills.has(demandSkill)) {
        suggestions.push({
          skill: demandSkill,
          currentLevel: 'none',
          targetLevel: SkillLevel.INTERMEDIATE,
          resources: UPSKILLING_RESOURCES[demandSkill] || [],
          estimatedDuration: '6-9 months',
        });
      }
    }

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }
}

export const onboardingService = new OnboardingService();
