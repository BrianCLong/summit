/**
 * Crypto Trainer - Educational cryptographic concepts
 * TRAINING/SIMULATION ONLY
 */

export interface CryptoLesson {
  id: string;
  title: string;
  category: 'symmetric' | 'asymmetric' | 'hashing' | 'protocols' | 'attacks';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  concepts: string[];
  exercises: CryptoExercise[];
}

export interface CryptoExercise {
  id: string;
  question: string;
  type: 'multiple_choice' | 'practical' | 'analysis';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  hints: string[];
}

export interface TrainingProgress {
  lessonsCompleted: string[];
  exercisesCompleted: Map<string, boolean>;
  score: number;
  streak: number;
}

export class CryptoTrainer {
  private lessons: Map<string, CryptoLesson> = new Map();
  private progress: TrainingProgress = {
    lessonsCompleted: [],
    exercisesCompleted: new Map(),
    score: 0,
    streak: 0
  };

  constructor() {
    this.initializeLessons();
  }

  private initializeLessons(): void {
    const lessons: CryptoLesson[] = [
      {
        id: 'sym-basics',
        title: 'Symmetric Encryption Basics',
        category: 'symmetric',
        difficulty: 'beginner',
        description: 'Learn the fundamentals of symmetric encryption algorithms',
        concepts: [
          'Block ciphers vs stream ciphers',
          'AES (Advanced Encryption Standard)',
          'Modes of operation (ECB, CBC, CTR, GCM)',
          'Key management',
          'Initialization vectors'
        ],
        exercises: [
          {
            id: 'sym-1',
            question: 'Which mode of operation should NEVER be used for encrypting multiple blocks?',
            type: 'multiple_choice',
            options: ['ECB', 'CBC', 'CTR', 'GCM'],
            correctAnswer: 0,
            explanation: 'ECB (Electronic Codebook) encrypts each block independently, causing identical plaintext blocks to produce identical ciphertext blocks, revealing patterns.',
            hints: ['Think about what happens with repeated patterns']
          },
          {
            id: 'sym-2',
            question: 'What is the key size of AES-256?',
            type: 'multiple_choice',
            options: ['128 bits', '192 bits', '256 bits', '512 bits'],
            correctAnswer: 2,
            explanation: 'AES-256 uses a 256-bit key, providing 2^256 possible keys.',
            hints: ['The number in the name indicates the key size']
          }
        ]
      },
      {
        id: 'asym-basics',
        title: 'Asymmetric Cryptography',
        category: 'asymmetric',
        difficulty: 'beginner',
        description: 'Understand public key cryptography fundamentals',
        concepts: [
          'Public and private key pairs',
          'RSA algorithm',
          'Elliptic Curve Cryptography (ECC)',
          'Digital signatures',
          'Key exchange (Diffie-Hellman)'
        ],
        exercises: [
          {
            id: 'asym-1',
            question: 'In RSA, which key is used for encryption when sending a confidential message?',
            type: 'multiple_choice',
            options: ['Sender\'s private key', 'Sender\'s public key', 'Recipient\'s private key', 'Recipient\'s public key'],
            correctAnswer: 3,
            explanation: 'To encrypt a message for confidentiality, you use the recipient\'s public key. Only the recipient\'s private key can decrypt it.',
            hints: ['Think about who needs to decrypt the message']
          }
        ]
      },
      {
        id: 'tls-analysis',
        title: 'TLS Protocol Analysis',
        category: 'protocols',
        difficulty: 'intermediate',
        description: 'Analyze TLS handshakes and identify security issues',
        concepts: [
          'TLS handshake process',
          'Certificate validation',
          'Cipher suite negotiation',
          'Perfect forward secrecy',
          'TLS 1.2 vs TLS 1.3 differences'
        ],
        exercises: [
          {
            id: 'tls-1',
            question: 'Which of the following provides Perfect Forward Secrecy?',
            type: 'multiple_choice',
            options: ['RSA key exchange', 'Static DH', 'ECDHE', 'PSK'],
            correctAnswer: 2,
            explanation: 'ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) generates new key pairs for each session, so compromising the server\'s private key doesn\'t compromise past sessions.',
            hints: ['Look for "ephemeral" key exchange']
          },
          {
            id: 'tls-2',
            question: 'What is the main improvement in TLS 1.3 handshake?',
            type: 'multiple_choice',
            options: ['Longer keys', '1-RTT handshake', 'New cipher', 'Shorter certificates'],
            correctAnswer: 1,
            explanation: 'TLS 1.3 reduces the handshake to 1 round-trip time (1-RTT) compared to TLS 1.2\'s 2-RTT, improving latency.',
            hints: ['Think about performance improvements']
          }
        ]
      },
      {
        id: 'traffic-analysis',
        title: 'Traffic Analysis Techniques',
        category: 'attacks',
        difficulty: 'advanced',
        description: 'Learn about analyzing encrypted traffic patterns',
        concepts: [
          'Metadata analysis',
          'Traffic fingerprinting',
          'Website fingerprinting',
          'Timing analysis',
          'Size-based analysis'
        ],
        exercises: [
          {
            id: 'ta-1',
            question: 'What can be determined from encrypted traffic WITHOUT decryption?',
            type: 'multiple_choice',
            options: ['Message content', 'All of the below', 'Packet sizes and timing', 'Encryption key'],
            correctAnswer: 2,
            explanation: 'Packet sizes, timing, and patterns can reveal information about the type of activity even without decryption.',
            hints: ['Think about observable metadata']
          }
        ]
      },
      {
        id: 'weak-crypto',
        title: 'Identifying Weak Cryptography',
        category: 'attacks',
        difficulty: 'intermediate',
        description: 'Learn to identify and avoid weak cryptographic implementations',
        concepts: [
          'Deprecated algorithms (DES, RC4, MD5, SHA-1)',
          'Weak key sizes',
          'Implementation vulnerabilities',
          'Side-channel attacks',
          'Padding oracle attacks'
        ],
        exercises: [
          {
            id: 'weak-1',
            question: 'Which hash algorithm should NOT be used for security purposes?',
            type: 'multiple_choice',
            options: ['SHA-256', 'SHA-384', 'MD5', 'SHA-512'],
            correctAnswer: 2,
            explanation: 'MD5 has known collision vulnerabilities and should not be used for security purposes. Use SHA-256 or better.',
            hints: ['One of these has known collisions']
          },
          {
            id: 'weak-2',
            question: 'What is the minimum recommended RSA key size for current use?',
            type: 'multiple_choice',
            options: ['512 bits', '1024 bits', '2048 bits', '4096 bits'],
            correctAnswer: 2,
            explanation: '2048 bits is the minimum recommended RSA key size. 1024-bit RSA is considered weak.',
            hints: ['Industry standards have changed over time']
          }
        ]
      }
    ];

    lessons.forEach(lesson => this.lessons.set(lesson.id, lesson));
  }

  /**
   * Get all available lessons
   */
  getLessons(): CryptoLesson[] {
    return Array.from(this.lessons.values());
  }

  /**
   * Get lessons by category
   */
  getLessonsByCategory(category: CryptoLesson['category']): CryptoLesson[] {
    return Array.from(this.lessons.values()).filter(l => l.category === category);
  }

  /**
   * Get lessons by difficulty
   */
  getLessonsByDifficulty(difficulty: CryptoLesson['difficulty']): CryptoLesson[] {
    return Array.from(this.lessons.values()).filter(l => l.difficulty === difficulty);
  }

  /**
   * Get a specific lesson
   */
  getLesson(lessonId: string): CryptoLesson | undefined {
    return this.lessons.get(lessonId);
  }

  /**
   * Submit an answer
   */
  submitAnswer(lessonId: string, exerciseId: string, answer: string | number): {
    correct: boolean;
    explanation: string;
    hints?: string[];
  } {
    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      return { correct: false, explanation: 'Lesson not found' };
    }

    const exercise = lesson.exercises.find(e => e.id === exerciseId);
    if (!exercise) {
      return { correct: false, explanation: 'Exercise not found' };
    }

    const correct = answer === exercise.correctAnswer;

    if (correct) {
      this.progress.exercisesCompleted.set(exerciseId, true);
      this.progress.score += 10;
      this.progress.streak++;

      // Check if lesson completed
      const allCompleted = lesson.exercises.every(
        e => this.progress.exercisesCompleted.get(e.id)
      );
      if (allCompleted && !this.progress.lessonsCompleted.includes(lessonId)) {
        this.progress.lessonsCompleted.push(lessonId);
        this.progress.score += 50; // Bonus for completing lesson
      }
    } else {
      this.progress.streak = 0;
    }

    return {
      correct,
      explanation: exercise.explanation,
      hints: correct ? undefined : exercise.hints
    };
  }

  /**
   * Get training progress
   */
  getProgress(): TrainingProgress & {
    totalLessons: number;
    totalExercises: number;
    completionPercentage: number;
  } {
    const totalLessons = this.lessons.size;
    const totalExercises = Array.from(this.lessons.values())
      .reduce((sum, l) => sum + l.exercises.length, 0);
    const completedExercises = this.progress.exercisesCompleted.size;

    return {
      ...this.progress,
      totalLessons,
      totalExercises,
      completionPercentage: totalExercises > 0
        ? (completedExercises / totalExercises) * 100
        : 0
    };
  }

  /**
   * Generate practice scenario
   */
  generatePracticeScenario(topic: string): {
    scenario: string;
    questions: string[];
    resources: string[];
  } {
    const scenarios: Record<string, { scenario: string; questions: string[]; resources: string[] }> = {
      'tls_analysis': {
        scenario: 'You have captured a TLS 1.2 handshake. The server selected TLS_RSA_WITH_AES_128_CBC_SHA. Analyze the security implications.',
        questions: [
          'Does this cipher suite provide perfect forward secrecy?',
          'What are the vulnerabilities of CBC mode?',
          'What improvements would TLS 1.3 provide?'
        ],
        resources: [
          'RFC 5246 - TLS 1.2',
          'RFC 8446 - TLS 1.3',
          'NIST SP 800-52 Rev 2'
        ]
      },
      'certificate_analysis': {
        scenario: 'A server presents a certificate signed with SHA-1 and has a 1024-bit RSA key. Evaluate the security.',
        questions: [
          'What are the risks of SHA-1 signatures?',
          'Is 1024-bit RSA adequate for current security?',
          'What should be the minimum requirements?'
        ],
        resources: [
          'NIST SP 800-57',
          'CA/Browser Forum Baseline Requirements',
          'RFC 6979'
        ]
      },
      'traffic_patterns': {
        scenario: 'You observe encrypted traffic with packets of exactly 160 bytes sent every 20ms. Identify the likely application.',
        questions: [
          'What type of application produces this pattern?',
          'What other metadata could confirm your hypothesis?',
          'How could the application mask this pattern?'
        ],
        resources: [
          'Website Fingerprinting research',
          'Traffic Analysis countermeasures',
          'Padding techniques'
        ]
      }
    };

    return scenarios[topic] || scenarios['tls_analysis'];
  }

  /**
   * Reset progress
   */
  resetProgress(): void {
    this.progress = {
      lessonsCompleted: [],
      exercisesCompleted: new Map(),
      score: 0,
      streak: 0
    };
  }
}
