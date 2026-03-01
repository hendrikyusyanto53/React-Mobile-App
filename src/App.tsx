import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Layout, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Menu,
  X,
  Trophy,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateCourseContent } from './services/courseService';
import { CourseData, Module, Question, AppState, StudentInfo } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [state, setState] = useState<AppState>('dashboard');
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examViolations, setExamViolations] = useState(0);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({ name: '', class: '', absentNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    async function init() {
      try {
        const data = await generateCourseContent();
        setCourseData(data);
      } catch (error) {
        console.error("Failed to load course:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Anti-tab switching logic
  useEffect(() => {
    if (state !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setExamViolations(prev => prev + 1);
        setShowWarning(true);
      }
    };

    const handleBlur = () => {
      setExamViolations(prev => prev + 1);
      setShowWarning(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state]);

  // Auto-submit if too many violations
  useEffect(() => {
    if (examViolations >= 3 && state === 'exam') {
      alert("Ujian dihentikan karena terlalu banyak pelanggaran (berpindah tab/jendela).");
      setState('result');
    }
  }, [examViolations, state]);

  const startExam = () => {
    setExamAnswers({});
    setExamViolations(0);
    setExamStartTime(Date.now());
    setState('registration');
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    const score = calculateScore();
    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentInfo,
          score,
          violations: examViolations
        })
      });
      setState('result');
    } catch (error) {
      console.error("Failed to save results:", error);
      alert("Gagal menyimpan hasil ujian. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    if (!courseData) return 0;
    let correct = 0;
    courseData.exam.forEach(q => {
      if (examAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / courseData.exam.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-sm uppercase tracking-widest text-black/50">Memuat Materi...</p>
        </div>
      </div>
    );
  }

  if (!courseData) return <div>Error loading data.</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-black/5 rounded-lg lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white">
              <Layout size={18} />
            </div>
            <h1 className="font-bold tracking-tight hidden sm:block">{courseData.courseTitle}</h1>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <button 
            onClick={() => setState('dashboard')}
            className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-full transition-colors",
              state === 'dashboard' ? "bg-black text-white" : "hover:bg-black/5"
            )}
          >
            Dashboard
          </button>
          <button 
            onClick={startExam}
            className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-2",
              state === 'exam' ? "bg-red-500 text-white" : "bg-black text-white hover:bg-black/80"
            )}
          >
            <GraduationCap size={16} />
            Ujian Akhir
          </button>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-black/10 transform transition-transform lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Modul Pembelajaran</h2>
            <div className="space-y-1">
              {courseData.modules.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCurrentModuleIndex(idx);
                    setState('lesson');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3",
                    state === 'lesson' && currentModuleIndex === idx 
                      ? "bg-black text-white font-medium" 
                      : "hover:bg-black/5 text-black/70"
                  )}
                >
                  <span className="font-mono text-[10px] opacity-50">0{idx + 1}</span>
                  <span className="truncate">{m.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 min-h-[calc(100-73px)]">
          <AnimatePresence mode="wait">
            {state === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-black text-white p-10 rounded-3xl relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-bold tracking-tight mb-4">Selamat Datang di Portal Belajar React Mobile</h2>
                    <p className="text-white/70 text-lg mb-8">Kuasai pengembangan aplikasi mobile menggunakan React dengan kurikulum terstruktur untuk siswa SMK.</p>
                    <button 
                      onClick={() => {
                        setCurrentModuleIndex(0);
                        setState('lesson');
                      }}
                      className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                    >
                      Mulai Belajar <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                    <Layout size={300} className="rotate-12 translate-x-1/4 -translate-y-1/4" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold mb-2">5 Modul Utama</h3>
                    <p className="text-sm text-black/60">Materi lengkap dari dasar hingga implementasi hooks.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-bold mb-2">Ujian Sertifikasi</h3>
                    <p className="text-sm text-black/60">Uji kemampuanmu dengan sistem ujian anti-curang.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Trophy size={20} />
                    </div>
                    <h3 className="font-bold mb-2">Hasil Instan</h3>
                    <p className="text-sm text-black/60">Dapatkan skor dan evaluasi langsung setelah ujian.</p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-black/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Panel Guru</h3>
                    <p className="text-black/50 text-sm">Download semua hasil ujian siswa dalam format CSV.</p>
                  </div>
                  <a 
                    href="/api/results/download" 
                    className="bg-[#F5F5F4] hover:bg-black hover:text-white text-black px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    Download Hasil (CSV)
                  </a>
                </div>
              </motion.div>
            )}

            {state === 'lesson' && (
              <motion.div 
                key="lesson"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-black/40">Modul 0{currentModuleIndex + 1}</span>
                    <h2 className="text-3xl font-bold tracking-tight">{courseData.modules[currentModuleIndex].title}</h2>
                  </div>
                </div>

                <div className="bg-white p-8 lg:p-12 rounded-3xl border border-black/5 shadow-sm prose prose-slate max-w-none">
                  <ReactMarkdown>{courseData.modules[currentModuleIndex].content}</ReactMarkdown>
                </div>

                <div className="mt-10 flex items-center justify-between">
                  <button 
                    disabled={currentModuleIndex === 0}
                    onClick={() => setCurrentModuleIndex(prev => prev - 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={20} /> Sebelumnya
                  </button>
                  
                  {currentModuleIndex < courseData.modules.length - 1 ? (
                    <button 
                      onClick={() => setCurrentModuleIndex(prev => prev + 1)}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition-colors"
                    >
                      Selanjutnya <ChevronRight size={20} />
                    </button>
                  ) : (
                    <button 
                      onClick={startExam}
                      className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Mulai Ujian <GraduationCap size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {state === 'registration' && (
              <motion.div 
                key="registration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto"
              >
                <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl">
                  <h2 className="text-2xl font-bold mb-6 text-center">Identitas Peserta Ujian</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={studentInfo.name}
                        onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#F5F5F4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black transition-all"
                        placeholder="Masukkan nama lengkap..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Kelas</label>
                      <input 
                        type="text" 
                        value={studentInfo.class}
                        onChange={(e) => setStudentInfo(prev => ({ ...prev, class: e.target.value }))}
                        className="w-full bg-[#F5F5F4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black transition-all"
                        placeholder="Contoh: XII PPLG 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Nomor Absensi</label>
                      <input 
                        type="text" 
                        value={studentInfo.absentNumber}
                        onChange={(e) => setStudentInfo(prev => ({ ...prev, absentNumber: e.target.value }))}
                        className="w-full bg-[#F5F5F4] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black transition-all"
                        placeholder="Contoh: 01"
                      />
                    </div>
                    <button 
                      disabled={!studentInfo.name || !studentInfo.class || !studentInfo.absentNumber}
                      onClick={() => setState('exam')}
                      className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none transition-all mt-4"
                    >
                      Mulai Ujian Sekarang
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {state === 'exam' && (
              <motion.div 
                key="exam"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-8 flex items-center gap-4 text-red-700">
                  <AlertTriangle className="shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold">Mode Ujian Aktif</p>
                    <p>Dilarang berpindah tab atau meminimalkan jendela. Pelanggaran: <strong>{examViolations}/3</strong></p>
                  </div>
                </div>

                <div className="space-y-8">
                  {courseData.exam.map((q, qIdx) => (
                    <div key={q.id} className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm">
                      <div className="flex gap-4">
                        <span className="font-mono text-lg font-bold text-black/20">{qIdx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-lg font-medium mb-6">{q.question}</p>
                          <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                onClick={() => setExamAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                className={cn(
                                  "text-left p-4 rounded-xl border transition-all flex items-center gap-4",
                                  examAnswers[q.id] === optIdx 
                                    ? "bg-black text-white border-black" 
                                    : "bg-white border-black/10 hover:border-black/30"
                                )}
                              >
                                <span className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                  examAnswers[q.id] === optIdx ? "bg-white/20" : "bg-black/5"
                                )}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex justify-center">
                  <button 
                    disabled={isSubmitting}
                    onClick={submitExam}
                    className="bg-black text-white px-12 py-4 rounded-full font-bold hover:bg-black/80 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? 'Mengirim...' : 'Selesaikan Ujian'}
                  </button>
                </div>
              </motion.div>
            )}

            {state === 'result' && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto text-center"
              >
                <div className="bg-white p-12 rounded-[40px] border border-black/5 shadow-xl">
                  <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-8">
                    <Trophy size={48} />
                  </div>
                  <h2 className="text-4xl font-bold mb-2">Hasil Ujian Anda</h2>
                  <p className="text-black/50 mb-10">Berikut adalah ringkasan performa ujian Anda.</p>
                  
                  <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="bg-[#F5F5F4] p-6 rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Skor Akhir</p>
                      <p className="text-5xl font-bold">{calculateScore()}</p>
                    </div>
                    <div className="bg-[#F5F5F4] p-6 rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Pelanggaran</p>
                      <p className={cn("text-5xl font-bold", examViolations > 0 ? "text-red-500" : "text-green-500")}>
                        {examViolations}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {calculateScore() >= 70 ? (
                      <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 /> Lulus Sertifikasi
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-600 font-bold">
                        <XCircle /> Belum Lulus
                      </div>
                    )}
                    
                    <button 
                      onClick={() => setState('dashboard')}
                      className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-black/80 transition-colors"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && state === 'exam' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Peringatan Pelanggaran!</h3>
              <p className="text-black/60 mb-8">
                Anda terdeteksi meninggalkan halaman ujian. Ini dianggap sebagai pelanggaran. 
                Batas maksimal pelanggaran adalah 3 kali.
              </p>
              <div className="bg-red-50 p-4 rounded-xl mb-8">
                <p className="text-sm font-bold text-red-700">Pelanggaran Saat Ini: {examViolations}/3</p>
              </div>
              <button 
                onClick={() => setShowWarning(false)}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-black/80 transition-colors"
              >
                Saya Mengerti, Lanjutkan Ujian
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
