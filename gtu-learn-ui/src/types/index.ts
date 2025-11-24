export interface MemoryTechnique {
  story_method?: {
    story: string;
    explanation: string;
  };
  memory_palace?: {
    total_places: number;
    places: MemoryPlace[];
  };
}

export interface MemoryPlace {
  place_number: number;
  location: string;
  visualization: string;
  how_to_place: string;
}

export interface Question {
  question_no: string;
  sub_question_no: string;
  question_text: string;
  diagram_representation: string | null;
  marks: number;
  tags: string[];
  answer: string;
  memory_techniques?: MemoryTechnique;
  rating?: number; // User rating from 1-5 stars
}

export interface QuestionPaper {
  metadata: {
    examination: string;
    subject_code: string;
    subject_name: string;
    total_marks: number;
  };
  questions: Question[];
}

export interface StudyProgress {
  questionId: string;
  completed: boolean;
  lastStudied?: Date;
}

export interface AppTheme {
  mode: 'light' | 'dark';
}