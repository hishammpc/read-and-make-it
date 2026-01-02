// Annual Evaluation Questions - 10 Competency Questions
// Based on MPC Spider Web Evaluation System

export interface AnnualEvaluationQuestion {
  id: string;
  category: string;
  categoryShort: string;
  shortLabel: string;
  question: string;
  levels: {
    tahap: number;
    label: string;
    description: string;
    marks: number;
  }[];
}

// Scoring: Tahap 1=2, Tahap 2=4, Tahap 3=6, Tahap 4=8, Tahap 5=10
export const SCORE_MAP: Record<number, number> = {
  1: 2,   // Sangat Lemah
  2: 4,   // Lemah
  3: 6,   // Sederhana
  4: 8,   // Bagus
  5: 10,  // Cemerlang
};

export const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Sangat Lemah', color: 'red' },
  2: { label: 'Lemah', color: 'orange' },
  3: { label: 'Sederhana', color: 'yellow' },
  4: { label: 'Bagus', color: 'blue' },
  5: { label: 'Cemerlang', color: 'green' },
};

export const ANNUAL_EVALUATION_QUESTIONS: AnnualEvaluationQuestion[] = [
  // Category 1: Kepimpinan & Pengurusan (3 questions)
  {
    id: 'q1',
    category: 'Kepimpinan & Pengurusan',
    categoryShort: 'A',
    shortLabel: 'Pengurusan Sumber',
    question: 'Keupayaan mengenalpasti, memperuntukan dan mengurus sumber yang berkesan untuk mencapai objektif.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Pengurusan sumber yang lemah dan sentiasa memerlukan pengawasan/bantuan' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Kemahiran pengurusan sumber yang biasa dan rutin' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Menguruskan peruntukan dan sumber dengan baik' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Menguruskan peruntukan dan sumber yang ada dengan cekap dan sangat baik' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Menguruskan peruntukan dan sumber dengan cekap dan berkesan mengikut tempoh masa yang diberikan' },
    ],
  },
  {
    id: 'q2',
    category: 'Kepimpinan & Pengurusan',
    categoryShort: 'A',
    shortLabel: 'Organisasi & Perancangan',
    question: 'Keupayaan memaparkan keyakinan dan bertindak atas tuntutan masa dan sumber yang terhad.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Kerja sentiasa tidak teratur; mengakibatkan gangguan kepada proses kerja' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Kerja diatur pada standard minimum pada masa yang diperlukan; menghasilkan kerja yang boleh diterima pakai' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Kerja sentiasa teratur dan mengikut standard jabatan' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Kerja dirancang dan disusun secara konsisten; menghasilkan kerja yang lancar menepati standard dengan betul' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Kerja sentiasa teratur dan sangat rapi; menghasilkan kerja yang paling cekap dan sangat baik, melebihi standard menggunakan inisiatif sendiri' },
    ],
  },
  {
    id: 'q3',
    category: 'Kepimpinan & Pengurusan',
    categoryShort: 'A',
    shortLabel: 'Penyelesaian Masalah',
    question: 'Keupayaan untuk mengenalpasti permasalahan, impak dan menghasilkan penyelesaian yang praktikal serta keupayaan untuk membuat keputusan yang baik berdasarkan logik, fakta dan bukti.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tidak ada keupayaan dalam mengenalpasti sesuatu permasalahan secara sistematik dan menyelesaikan masalah' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Lemah dalam mengenalpasti sesuatu permasalahan dan menyelesaikan masalah' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Berupaya dalam mengenalpasti sesuatu permasalahan dan membuat keputusan yang umum' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Berkebolehan dalam mengenalpasti sesuatu permasalahan dengan baik dan boleh membuat keputusan yang sewajarnya' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Pakar dalam mengenalpasti sesuatu permasalahan secara sistematik dan mahir dalam membuat keputusan yang berkesan' },
    ],
  },

  // Category 2: Kemahiran Konsep dan Analisa (2 questions)
  {
    id: 'q4',
    category: 'Kemahiran Konsep dan Analisa',
    categoryShort: 'B',
    shortLabel: 'Pengurusan Pengetahuan & Maklumat',
    question: 'Keupayaan mengumpul, menyemak, validasi, merumus, menyimpan dan menyampaikan maklumat.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Kecekapan tidak ditunjukkan atau hanya kesedaran asas dan sentiasa memerlukan pengawasan/bantuan' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Mendapat manfaat dengan ilmu yang dipelajari tetapi tidak mahir dalam mengaitkan pengetahuan tersebut dengan situasi sebenar' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Berupaya untuk menyumbang idea dengan ilmu yang dipelajari dan kurang mahir dalam mengaplikasikan pengetahuan tersebut dengan situasi sebenar' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Berupaya menyumbang idea dengan ilmu yang dipelajari dan mampu mengaplikasikan pengetahuan tersebut dengan situasi sebenar' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Bersifat proaktif dalam menyumbang idea yang kreatif dengan ilmu yang dipelajari dan bijak mengaplikasikan pengetahuan tersebut dalam situasi sebenar' },
    ],
  },
  {
    id: 'q5',
    category: 'Kemahiran Konsep dan Analisa',
    categoryShort: 'B',
    shortLabel: 'Penjanaan Idea Kreatif & Inovatif',
    question: 'Kecenderungan dalam mempelajari ilmu baharu dan menerapkan ilmu tersebut dalam penghasilan kerja.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tiada inisiatif untuk menyumbang sebarang idea dalam menjalankan tugasan kerja' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Mempunyai inisiatif dalam menyumbang idea tetapi idea tersebut tidak sesuai diaplikasikan dalam tugasan kerja' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Berkebolehan dalam menyumbang idea-idea yang kreatif dan dapat diaplikasikan dalam penghasilan kerja' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Berkebolehan dalam menyumbang kepada idea-idea yang kreatif dan inovatif serta membawa kepada peningkatan penghasilan kerja' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Proaktif dalam menyumbang kepada idea-idea yang kreatif dan inovatif serta membawa kepada transformasi dalam penghasilan kerja' },
    ],
  },

  // Category 3: Pengurusan Kerja & Masa (4 questions)
  {
    id: 'q6',
    category: 'Pengurusan Kerja & Masa',
    categoryShort: 'C',
    shortLabel: 'Profesionalisme',
    question: 'Keupayaan mempamerkan imej profesional yang berpunca dari kepercayaan, saling menghormati dan tingkah laku.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tidak memiliki tingkah laku yang menyenangkan atau tidak mesra kepada rakan sekerja dan penyelia' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Mempamerkan tingkah laku yang sederhana dan kurang mesra kepada rakan sekerja dan penyelia' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Mempamerkan tingkah laku yang baik dan hormat hanya kepada penyelia' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Bertanggungjawab dan mempamerkan tingkah laku dalam melaksanakan kerja yang baik serta menunjukkan rasa hormat pada rakan sekerja dan penyelia pada setiap masa' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Sentiasa bertanggungjawab, mempamerkan tingkah laku dalam melaksanakan kerja yang cemerlang dan menunjukkan rasa hormat pada rakan sekerja dan penyelia pada setiap masa dalam apa jua keadaan' },
    ],
  },
  {
    id: 'q7',
    category: 'Pengurusan Kerja & Masa',
    categoryShort: 'C',
    shortLabel: 'Pengurusan Kerja',
    question: 'Keupayaan mengutamakan dan memantau dengan berkesan tugasan, aktiviti dan prestasi dengan bimbingan yang terhad.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tugasan/kerja sentiasa tidak diurus dengan baik menyebabkan gangguan pada proses aliran kerja' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Tugasan/kerja diurus mengikut minima piawaian yang diperlukan dan menghasilkan proses aliran kerja yang sederhana' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Tugasan/kerja sentiasa dalam keadaan yang terurus dan menghasilkan proses aliran kerja yang baik' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Tugasan/kerja diurus secara konsisten bagi menghasilkan proses aliran kerja yang lancar' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Tugasan/kerja diuruskan dengan sangat baik dan menghasilkan aliran kerja yang berkesan dan sangat lancar' },
    ],
  },
  {
    id: 'q8',
    category: 'Pengurusan Kerja & Masa',
    categoryShort: 'C',
    shortLabel: 'Pengurusan Masa',
    question: 'Keupayaan memaparkan keyakinan dan bertindak atas tuntutan masa dan sumber yang terhad.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Sering kali tidak menyelesaikan tugasan/kerja pada ketetapan masa yang ditetapkan walaupun telah diberi peringatan' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Tugasan hanya diselesaikan pada atau selepas tarikh akhir penyerahan tugas dengan peringatan' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Tugasan dapat diselesaikan pada tarikh yang ditetapkan tanpa sebarang peringatan' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Kadang-kadang dapat menyelesaikan tugasan lebih awal dari tarikh yang ditetapkan' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Sering kali dapat menyelesaikan tugasan lebih awal dari tarikh yang ditetapkan' },
    ],
  },
  {
    id: 'q9',
    category: 'Pengurusan Kerja & Masa',
    categoryShort: 'C',
    shortLabel: 'Kolaborasi',
    question: 'Keupayaan untuk bekerjasama dan menyokong orang lain dalam usaha mencapai objektif.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tidak menunjukkan kerjasama berpasukan dalam mencapai sesuatu matlamat kerja dan kurang peduli kepada rakan sekerja' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Kadang kala menunjukkan semangat berpasukan dan rasa prihatin hanya apabila khidmat diperlukan' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Dapat bekerja dalam kumpulan dan dapat menyokong ahli kumpulan dan majikan sahaja' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Secara konsisten memberi sokongan, bantuan, dan menunjukkan semangat berpasukan yang tinggi serta menghargai ahli kumpulan, pelanggan dan majikan' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Sentiasa memberi sokongan, bantuan, dan menunjukkan semangat berpasukan yang cemerlang serta sentiasa menghargai ahli kumpulan, pelanggan dan majikan' },
    ],
  },

  // Category 4: Komunikasi Lisan & Penulisan (1 question)
  {
    id: 'q10',
    category: 'Komunikasi Lisan & Penulisan',
    categoryShort: 'D',
    shortLabel: 'Penulisan',
    question: 'Keupayaan untuk menyampaikan maklumat secara bertulis secara berkesan.',
    levels: [
      { tahap: 1, label: 'Sangat Lemah', marks: 2, description: 'Tidak pernah menulis dan menyediakan sebarang dokumen bertulis dalaman MPC' },
      { tahap: 2, label: 'Lemah', marks: 4, description: 'Menulis dan menyediakan minit mesyuarat, nota perbincangan, RO, surat menyurat' },
      { tahap: 3, label: 'Sederhana', marks: 6, description: 'Menulis dan menyediakan laporan kemajuan/ringkasan projek, membangunkan slaid pembentangan / menulis kertas kerja pengurusan MPC, menyediakan dokumen perolehan MPC, artikel keratan akhbar' },
      { tahap: 4, label: 'Bagus', marks: 8, description: 'Menulis dan menyediakan kertas kerja Lembaga Pengarah MPC, artikel untuk penerbitan prosiding / APR dan seumpamanya' },
      { tahap: 5, label: 'Cemerlang', marks: 10, description: 'Menulis dan menyediakan laporan kajian, buku, kertas polisi' },
    ],
  },
];

// Helper function to calculate total score from answers
export function calculateTotalScore(answers: Record<string, number>): number {
  return Object.values(answers).reduce((sum, tahap) => sum + (SCORE_MAP[tahap] || 0), 0);
}

// Helper function to calculate percentage
export function calculatePercentage(answers: Record<string, number>): number {
  const total = calculateTotalScore(answers);
  return Math.round((total / 100) * 100);
}

// Helper function to get rating label based on percentage
export function getRatingLabel(percentage: number): { label: string; color: string } {
  if (percentage >= 80) return { label: 'Cemerlang', color: 'green' };
  if (percentage >= 60) return { label: 'Bagus', color: 'blue' };
  if (percentage >= 40) return { label: 'Sederhana', color: 'yellow' };
  if (percentage >= 20) return { label: 'Lemah', color: 'orange' };
  return { label: 'Sangat Lemah', color: 'red' };
}

// Get questions grouped by category
export function getQuestionsByCategory(): Record<string, AnnualEvaluationQuestion[]> {
  return ANNUAL_EVALUATION_QUESTIONS.reduce((acc, q) => {
    if (!acc[q.category]) {
      acc[q.category] = [];
    }
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, AnnualEvaluationQuestion[]>);
}
