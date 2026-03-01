export interface Module {
  id: string;
  title: string;
  content: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface CourseData {
  courseTitle: string;
  modules: Module[];
  exam: Question[];
}

export type AppState = 'dashboard' | 'lesson' | 'registration' | 'exam' | 'result';

export interface StudentInfo {
  name: string;
  class: string;
  absentNumber: string;
}
