/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, RefreshCcw, Download, CheckCircle, 
  XCircle, BookOpen, Award, User, Settings,
  List, LayoutGrid, Book, MessageSquare, Leaf, Zap, Flame, Mic, AlertCircle, Star, Volume2
} from 'lucide-react';

// --- Global Data untuk Distractor (Pilihan Salah) ---
const ALL_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Asy-Syu'ara'", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

// --- Web Audio API untuk Efek Suara ---
const playBuzzer = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) { console.error("Audio API error", e); }
};

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) { console.error("Audio API error", e); }
};

export default function App() {
  // --- States ---
  const [step, setStep] = useState('setup'); 
  
  // Setup State
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [selectedJuz, setSelectedJuz] = useState(30);
  const [surahsInJuz, setSurahsInJuz] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState("all");
  const [numQuestions, setNumQuestions] = useState(5);
  const [gameType, setGameType] = useState('lanjut_ayat'); 
  const [difficulty, setDifficulty] = useState('menengah'); 
  
  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // Data State
  const [juzData, setJuzData] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  
  // Playing State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null); 
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Khusus untuk Game 2 (Susun Kata)
  const [scrambledWords, setScrambledWords] = useState<any[]>([]);
  const [arrangedWords, setArrangedWords] = useState<any[]>([]);
  const [showAlhamdulillah, setShowAlhamdulillah] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 10;
      rec.lang = 'ar-SA'; // Default to Arabic for Lanjut Ayat
      
      rec.onresult = (event: any) => {
        const results = event.results[0];
        const allTranscripts = Array.from(results).map((r: any) => r.transcript);
        
        setTranscript(allTranscripts[0]); // Untuk tampilan UI
        setTranscripts(allTranscripts);   // Untuk pengecekan akurasi
        setIsListening(false);
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'network') {
          setVoiceError("Koneksi internet bermasalah atau layanan suara tidak tersedia. Pastikan internet stabil.");
        } else if (event.error === 'not-allowed') {
          setVoiceError("Izin mikrofon ditolak. Mohon izinkan akses mikrofon di browser Anda.");
        } else {
          setVoiceError(`Terjadi kesalahan: ${event.error}`);
        }
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(rec);
    }
  }, []);

  useEffect(() => {
    setIsFetching(true);
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/juz/${selectedJuz}/ar.alafasy`).then(res => res.json()),
      fetch(`https://api.alquran.cloud/v1/juz/${selectedJuz}/id.indonesian`).then(res => res.json())
    ])
    .then(([arData, idData]) => {
      const ayahsAr = arData.data.ayahs;
      const ayahsId = idData.data.ayahs;
      
      const mergedData = ayahsAr.map((ayah: any, index: number) => ({
        ...ayah,
        translation: ayahsId[index].text 
      }));
      
      setJuzData(mergedData);
      
      const surahMap = new Map();
      mergedData.forEach((ayah: any) => {
        surahMap.set(ayah.surah.number, ALL_SURAHS[ayah.surah.number - 1]);
      });
      
      setSurahsInJuz(Array.from(surahMap, ([number, name]) => ({ number, name })));
      setSelectedSurah("all");
      setIsFetching(false);
    })
    .catch(err => {
      console.error("Gagal mengambil data Al-Quran", err);
      setIsFetching(false);
    });
  }, [selectedJuz]);

  useEffect(() => {
    if (step === 'playing' && (gameType === 'susun_kata' || gameType === 'susun_arti_perkata') && questions[currentIndex]) {
      const currentQ = questions[currentIndex];
      const textToSplit = gameType === 'susun_kata' ? currentQ.answerText : currentQ.answerTranslation;
      const cleanText = textToSplit.trim().replace(/\s{2,}/g, ' ');
      const words = cleanText.split(' ').map((w: string, i: number) => ({ id: i, text: w }));
      
      setScrambledWords(words.sort(() => 0.5 - Math.random()));
      setArrangedWords([]);
    }
  }, [currentIndex, step, gameType, questions]);

  useEffect(() => {
    if (step === 'playing' && gameType === 'lanjut_ayat_suara' && transcripts.length > 0 && !isListening) {
      checkVoiceAnswerMulti(transcripts);
    }
  }, [transcripts, isListening, step, gameType]);

  // --- Handlers ---
  
  const getRandomDistractors = (items: string[], correctItem: string, count: number) => {
    const uniqueItems = [...new Set(items)]; 
    const filtered = uniqueItems.filter(item => item !== correctItem); 
    return filtered.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentClass) {
      alert("Mohon lengkapi Nama dan Kelas terlebih dahulu.");
      return;
    }

    let pool = juzData;
    if (selectedSurah !== "all") {
      pool = juzData.filter(ayah => ayah.surah.number === parseInt(selectedSurah));
    }

    let validPrompts = pool;
    if (gameType === 'lanjut_ayat' || gameType === 'lanjut_ayat_suara' || gameType === 'susun_kata' || gameType === 'susun_arti_perkata') {
      validPrompts = pool.filter(ayah => {
        const globalIndex = juzData.findIndex(a => a.number === ayah.number);
        if (globalIndex < 0 || globalIndex >= juzData.length - 1) return false;
        
        if (selectedSurah !== "all") {
          return juzData[globalIndex + 1].surah.number === parseInt(selectedSurah);
        }
        return true;
      });
    }

    if (validPrompts.length < numQuestions) {
      alert(`Hanya ada ${validPrompts.length} kemungkinan soal di target ini. Mohon kurangi jumlah soal.`);
      return;
    }

    const shuffled = validPrompts.sort(() => 0.5 - Math.random());
    const selectedPrompts = shuffled.slice(0, numQuestions);

    let numDistractors = 3; 
    if (difficulty === 'mudah') numDistractors = 2; 
    if (difficulty === 'sulit') numDistractors = 4; 

    const generatedQuestions = selectedPrompts.map(promptAyah => {
      const globalIndex = juzData.findIndex(a => a.number === promptAyah.number);
      let q: any = { prompt: promptAyah, type: gameType };

      if (gameType === 'lanjut_ayat' || gameType === 'lanjut_ayat_suara') {
        const answerAyah = juzData[globalIndex + 1];
        q.answerText = answerAyah.text;
        q.answerAudio = answerAyah.audio;
        if (gameType === 'lanjut_ayat') {
          const allTexts = juzData.map(a => a.text);
          const distractors = getRandomDistractors(allTexts, q.answerText, numDistractors);
          q.options = [q.answerText, ...distractors].sort(() => 0.5 - Math.random());
        }
      } 
      else if (gameType === 'susun_kata' || gameType === 'susun_arti_perkata') {
        const answerAyah = juzData[globalIndex + 1];
        q.answerText = answerAyah.text;
        q.answerTranslation = answerAyah.translation;
        q.answerAudio = answerAyah.audio;
      } 
      else if (gameType === 'tebak_surat') {
        q.answerText = ALL_SURAHS[promptAyah.surah.number - 1]; 
        const distractors = getRandomDistractors(ALL_SURAHS, q.answerText, numDistractors);
        q.options = [q.answerText, ...distractors].sort(() => 0.5 - Math.random());
      } 
      else if (gameType === 'tebak_arti') {
        q.answerText = promptAyah.translation;
        const allTranslations = juzData.map(a => a.translation);
        const distractors = getRandomDistractors(allTranslations, q.answerText, numDistractors);
        q.options = [q.answerText, ...distractors].sort(() => 0.5 - Math.random());
      }
      return q;
    });

    setQuestions(generatedQuestions);
    setScore(0);
    setCurrentIndex(0);
    setFeedback(null);
    setTranscript('');
    setStep('playing');
  };

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    
    // 1. Dasar: Hapus harakat/diakritik & spasi berlebih
    let normalized = text.trim().replace(/\s{2,}/g, ' ');
    
    // Hapus semua harakat & simbol Al-Quran (Waqf, Sajdah, dll)
    // Kita ganti simbol-simbol ini dengan spasi agar tidak menempelkan kata
    normalized = normalized.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u0671\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, ' ');
    
    // 2. Hapus tanda baca & karakter non-huruf Arab (termasuk Tatweel)
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟ـ]/g, " ");
    
    // Bersihkan spasi ganda hasil penggantian simbol tadi
    normalized = normalized.replace(/\s{2,}/g, ' ');
    
    // 3. Normalisasi Karakter (Alif, Ya, Ta Marbuta, Waw, Hamza)
    // Alif: أ, إ, آ, ٱ -> ا
    normalized = normalized.replace(/[أإآٱ]/g, 'ا');
    // Ya/Alif Maqsura: ي, ى -> ي
    normalized = normalized.replace(/[يى]/g, 'ي');
    // Ta Marbuta: ة -> ه
    normalized = normalized.replace(/ة/g, 'ه');
    // Waw: ؤ -> و
    normalized = normalized.replace(/ؤ/g, 'و');
    // Hamza on Chair: ئ -> ي
    normalized = normalized.replace(/ئ/g, 'ي');
    // Hamza alone: ء -> (biasanya diabaikan dalam STT jika di akhir)
    normalized = normalized.replace(/ء/g, '');
    
    // 4. Menghapus Basmalah & Hamdalah di awal ayat jika ada (lebih agresif)
    const basmalahPatterns = [
      /^بسم الله الرحمن الرحيم\s*/,
      /^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/,
      /^بسم الله\s*/,
      /^الحمد لله\s*/,
      /^اعوذ بالله من الشيطان الرجيم\s*/
    ];
    basmalahPatterns.forEach(pattern => {
      normalized = normalized.replace(pattern, '');
    });
    
    return normalized.trim();
  };

  const handleAnswerMultipleChoice = (selectedAnswer: string) => {
    if (feedback) return; 
    
    const currentQ = questions[currentIndex];
    const normalizedSelected = normalizeArabic(selectedAnswer);
    const normalizedCorrect = normalizeArabic(currentQ.answerText);

    if (normalizedSelected === normalizedCorrect) {
      playDing();
      setFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playBuzzer();
      setFeedback('incorrect');
    }
  };

  const checkSusunKata = () => {
    if (feedback) return;
    const userAnswer = arrangedWords.map(w => w.text).join(' ');
    const currentQ = questions[currentIndex];
    
    const normalizedUser = normalizeArabic(userAnswer);
    const normalizedCorrect = normalizeArabic(currentQ.answerText);

    if (normalizedUser === normalizedCorrect) {
      playDing();
      setFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playBuzzer();
      setFeedback('incorrect');
    }
  };

  const checkSusunArti = () => {
    if (feedback) return;
    const userAnswer = arrangedWords.map(w => w.text).join(' ').toLowerCase();
    const currentQ = questions[currentIndex];
    const correctAnswer = currentQ.answerTranslation.trim().replace(/\s{2,}/g, ' ').toLowerCase();

    if (userAnswer === correctAnswer) {
      playDing();
      setFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playBuzzer();
      setFeedback('incorrect');
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('');
      setTranscripts([]);
      setVoiceError(null);
      setIsListening(true);
      try {
        recognition.start();
      } catch (e) {
        console.error("Recognition start error", e);
        setIsListening(false);
        setVoiceError("Gagal memulai perekaman. Coba segarkan halaman.");
      }
    }
  };

  const checkVoiceAnswerMulti = (voiceTexts: string[]) => {
    if (feedback) return;
    const currentQ = questions[currentIndex];
    const normalizedCorrect = normalizeArabic(currentQ.answerText);
    const tightCorrect = normalizedCorrect.replace(/\s/g, '');
    const wordsCorrect = normalizedCorrect.split(/\s+/).filter(w => w.length > 0);

    // Fungsi pembantu untuk fuzzy match kata (1 char diff allowed for long words)
    const isFuzzyMatch = (w1: string, w2: string) => {
      if (w1 === w2) return true;
      if (Math.abs(w1.length - w2.length) > 1) return false;
      if (w1.length < 4) return w1 === w2; // Kata pendek harus pas
      
      let diff = 0;
      const len = Math.min(w1.length, w2.length);
      for (let i = 0; i < len; i++) {
        if (w1[i] !== w2[i]) diff++;
      }
      return diff <= 1;
    };

    // Cek setiap alternatif hasil suara
    for (const voiceText of voiceTexts) {
      const normalizedVoice = normalizeArabic(voiceText);
      const tightVoice = normalizedVoice.replace(/\s/g, '');
      const wordsVoice = normalizedVoice.split(/\s+/).filter(w => w.length > 0);

      // 1. Exact Match (Normal & Tight)
      if (normalizedVoice === normalizedCorrect || tightVoice === tightCorrect) {
        playDing();
        setFeedback('correct');
        setScore(prev => prev + 1);
        return;
      }

      // 2. Inclusion & Fuzzy Word Matching
      const intersection = wordsVoice.filter(wv => wordsCorrect.some(wc => isFuzzyMatch(wv, wc)));
      const similarity = intersection.length / Math.max(wordsVoice.length, wordsCorrect.length);
      
      // Cek apakah semua kata kunci ada (dengan toleransi fuzzy)
      const allWordsPresent = wordsCorrect.every(wc => wordsVoice.some(wv => isFuzzyMatch(wv, wc)));

      // Strictness check: User must have said a significant portion
      const lengthCheck = wordsVoice.length >= Math.min(wordsCorrect.length, 3) || wordsVoice.length >= wordsCorrect.length * 0.6;

      if (
        (normalizedVoice.includes(normalizedCorrect)) || 
        tightVoice.includes(tightCorrect) ||
        (allWordsPresent) ||
        similarity > 0.65 // Balanced threshold
      ) {
        playDing();
        setFeedback('correct');
        setScore(prev => prev + 1);
        return;
      }
    }

    // Jika tidak ada alternatif yang cocok
    playBuzzer();
    setFeedback('incorrect');
  };

  const checkVoiceAnswer = (voiceText: string) => {
    checkVoiceAnswerMulti([voiceText]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
      setIsPlayingAudio(false);
      setTranscript('');
    } else {
      setStep('result');
    }
  };

  // --- UI Renderers ---

  const renderSetup = () => (
    <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(30,58,138,0.15)] overflow-hidden border border-slate-100">
      
      {/* Header Banner - Navy & Gold */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-8 sm:p-12 text-white text-center relative overflow-hidden border-b-[6px] border-amber-500">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-400 opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-xl"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] mix-blend-overlay"></div>
        
        <div className="flex justify-center mb-2">
          <span className="bg-amber-400 text-blue-950 text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-amber-300 animate-bounce relative z-10 uppercase tracking-widest">PRO VERSION</span>
        </div>
        <BookOpen className="w-16 h-16 mx-auto mb-4 drop-shadow-md text-amber-400 relative z-10" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight relative z-10 drop-shadow-sm">
          PROGRAM UNGGULAN<span className="text-amber-400"> TAHFIDZ</span>
        </h1>
        <p className="text-blue-100 mt-3 text-sm sm:text-base font-medium relative z-10 max-w-md mx-auto">
          Platform interaktif modern SMP Muhammadiyah 1 Probolinggo untuk menguji dan memperkuat hafalan Al-Qur'an Kamu.
        </p>
      </div>

      <form onSubmit={handleStart} className="p-6 sm:p-10 space-y-8 bg-white">
        {/* Identitas Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             Profil Peserta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input 
                type="text" required 
                value={studentName} onChange={e => setStudentName(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-0 transition-all outline-none font-bold" 
                placeholder="Nama Lengkap"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Award className="h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input 
                type="text" required 
                value={studentClass} onChange={e => setStudentClass(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-400 focus:ring-0 transition-all outline-none font-bold" 
                placeholder="Kelas"
              />
            </div>
          </div>
        </div>

        {/* Jenis Permainan Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Pilih Mode Ujian
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { id: 'lanjut_ayat', icon: List, label: "Lanjut Ayat" },
              { id: 'lanjut_ayat_suara', icon: Zap, label: "Lanjut Ayat (Suara)" },
              { id: 'susun_kata', icon: LayoutGrid, label: "Susun Kata" },
              { id: 'susun_arti_perkata', icon: Book, label: "Susun Arti" },
              { id: 'tebak_surat', icon: Book, label: "Tebak Surat" },
              { id: 'tebak_arti', icon: MessageSquare, label: "Tebak Arti" },
            ].map(type => (
              <button
                key={type.id} type="button"
                onClick={() => setGameType(type.id)}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1 ${
                  gameType === type.id 
                    ? 'bg-blue-900 border-blue-950 text-white shadow-md shadow-blue-900/20' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-blue-900'
                }`}
              >
                <type.icon className={`w-7 h-7 ${gameType === type.id ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold text-center ${gameType === type.id ? 'text-white' : ''}`}>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tingkat Kesulitan Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Tingkat Kesulitan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'mudah', icon: Leaf, label: "Mudah", desc: "Teks Tampil & 3 Opsi" },
              { id: 'menengah', icon: Zap, label: "Menengah", desc: "Tanpa Teks & 4 Opsi" },
              { id: 'sulit', icon: Flame, label: "Sulit", desc: "Tanpa Teks & 5 Opsi" },
            ].map(lvl => (
              <button
                key={lvl.id} type="button"
                onClick={() => setDifficulty(lvl.id)}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1 ${
                  difficulty === lvl.id 
                    ? 'bg-blue-900 border-blue-950 text-white shadow-md shadow-blue-900/20' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-blue-900'
                }`}
              >
                <lvl.icon className={`w-6 h-6 ${difficulty === lvl.id ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold text-center ${difficulty === lvl.id ? 'text-white' : ''}`}>{lvl.label}</span>
                <span className={`text-xs text-center opacity-80 ${difficulty === lvl.id ? 'text-blue-100' : 'text-slate-400'}`}>{lvl.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Hafalan Section */}
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-6 relative overflow-hidden">
          <Settings className="absolute -right-4 -top-4 w-32 h-32 text-slate-200 opacity-50 pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Pilih Juz</label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[...Array(30)].map((_, i) => (
                <button
                  key={i + 1} type="button" onClick={() => setSelectedJuz(i + 1)}
                  className={`aspect-square rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center border-b-2 active:border-b-0 active:translate-y-0.5 ${
                    selectedJuz === i + 1 
                      ? 'bg-amber-400 border-amber-500 text-blue-950 shadow-sm shadow-amber-400/30' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:text-blue-900'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Pilih Surat</label>
              <select 
                value={selectedSurah} onChange={e => setSelectedSurah(e.target.value)}
                disabled={isFetching}
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:ring-0 transition-all text-slate-800 font-bold cursor-pointer disabled:opacity-50 appearance-none"
              >
                <option value="all">📚 Semua Surat di Juz {selectedJuz}</option>
                {surahsInJuz.map(surah => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Jumlah Soal</label>
              <div className="relative">
                <input 
                  type="number" min="1" max="50" required 
                  value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))}
                  className="w-full p-4 pl-6 bg-white border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:ring-0 transition-all text-slate-800 font-black text-lg" 
                />
                <span className="absolute right-6 top-4 text-slate-400 font-bold">Soal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" disabled={isFetching}
          className="w-full py-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 text-blue-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-150 disabled:opacity-50 flex justify-center items-center gap-3 text-lg uppercase tracking-wider"
        >
          {isFetching ? <RefreshCcw className="w-6 h-6 animate-spin" /> : "Mulai Uji Kemampuan"}
        </button>
      </form>
    </div>
  );

  const renderPlaying = () => {
    const currentQ = questions[currentIndex];
    const progressPercent = ((currentIndex) / questions.length) * 100;
    
    const toggleAudio = () => {
      if (audioRef.current) {
        if (isPlayingAudio) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } else {
          audioRef.current.play();
        }
        setIsPlayingAudio(!isPlayingAudio);
      }
    };

    return (
      <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(30,58,138,0.15)] overflow-hidden border border-slate-100">
        
        {/* Modern Progress Header */}
        <div className="bg-white p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-500 font-bold text-sm uppercase tracking-wider">
              Soal {currentIndex + 1} <span className="text-slate-400 font-medium">dari {questions.length}</span>
            </span>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 py-1.5 px-4 rounded-full text-sm font-black shadow-sm">
                <Flame className="w-4 h-4 fill-rose-500" />
                Streak: {score}
              </div>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-900 border border-blue-100 py-1.5 px-4 rounded-full text-sm font-black shadow-sm">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                Skor: {score}
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-amber-500 h-3 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          {/* Audio Player (Pancingan) */}
          <div className="text-center mb-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
              Dengarkan Pancingan
            </h3>
            
            <div className="inline-flex items-center gap-5 bg-white p-3 pr-8 rounded-[2rem] border-2 border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-blue-200 group">
              <audio 
                ref={audioRef} src={currentQ.prompt.audio} 
                onEnded={() => setIsPlayingAudio(false)} 
              />
              <button 
                onClick={toggleAudio} 
                className={`p-5 rounded-full shadow-md transition-transform duration-200 hover:scale-105 active:scale-95 ${isPlayingAudio ? 'bg-rose-500' : 'bg-gradient-to-br from-blue-950 to-blue-900'} text-white`}
              >
                {isPlayingAudio ? <Square className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-amber-400 ml-1 text-amber-400" />}
              </button>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-lg">
                  QS. {gameType === 'tebak_surat' ? '???' : ALL_SURAHS[currentQ.prompt.surah.number - 1]} : {currentQ.prompt.numberInSurah}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 group-hover:text-blue-800 transition-colors">Ketuk tombol untuk putar audio</p>
              </div>
            </div>

            {/* Teks Arab Pancingan - Didesain agar sangat mudah dibaca */}
            <div className="mt-8 relative min-h-[100px] flex items-center justify-center">
              {difficulty === 'mudah' ? (
                <div className="py-6 px-4 w-full bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                  <p className="text-3xl sm:text-4xl text-center leading-[2.5] font-arabic text-slate-800 drop-shadow-sm" dir="rtl">
                    {currentQ.prompt.text}
                  </p>
                </div>
              ) : (
                <div className="py-8 w-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                  <Book className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-sm font-bold uppercase tracking-widest mb-1 text-slate-500">Teks Disembunyikan</p>
                  <p className="text-xs font-medium">Fokus dengarkan audio untuk menebak ayat</p>
                </div>
              )}
            </div>
          </div>

          <hr className="my-8 border-slate-100" />

          {/* Render Area Interaktif Berdasarkan Game Type */}
          
          {/* GAME 1, 3, 4: PILIHAN GANDA */}
          {['lanjut_ayat', 'tebak_surat', 'tebak_arti'].includes(gameType) && (
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                {gameType === 'lanjut_ayat' && "Pilih Lanjutan Ayat yang Benar!"}
                {gameType === 'tebak_surat' && "Surat Apakah Ini?"}
                {gameType === 'tebak_arti' && "Apa Arti Ayat Di Atas?"}
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {currentQ.options.map((option: string, idx: number) => {
                  let btnClass = "p-5 sm:p-6 text-left rounded-2xl transition-all duration-200 border-b-[5px] active:border-b-0 active:translate-y-[5px] ";
                  
                  // Text Arab untuk Opsi Lanjut Ayat juga diperbesar agar jelas
                  const textClass = gameType === 'lanjut_ayat' 
                    ? "font-arabic text-2xl sm:text-3xl leading-[2.2] text-right block text-slate-800 py-2" 
                    : "text-base sm:text-lg text-slate-700 block font-bold";
                  
                  if (feedback) {
                    if (option === currentQ.answerText) {
                      btnClass += "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-300 shadow-sm"; 
                    } else {
                      btnClass += "bg-slate-50 border-slate-200 opacity-50"; 
                    }
                  } else {
                    btnClass += "bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/30";
                  }

                  return (
                    <button 
                      key={idx} 
                      disabled={feedback !== null}
                      onClick={() => handleAnswerMultipleChoice(option)}
                      className={btnClass}
                      dir={gameType === 'lanjut_ayat' ? 'rtl' : 'ltr'}
                    >
                      <span className={textClass}>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GAME 2: SUSUN KATA & SUSUN ARTI */}
          {(gameType === 'susun_kata' || gameType === 'susun_arti_perkata') && (
            <div className="space-y-6 text-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                {gameType === 'susun_kata' ? "Susun Ayat Selanjutnya" : "Susun Arti Ayat Selanjutnya"}
              </h3>
              
              {difficulty === 'mudah' && gameType === 'susun_kata' && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900 text-sm font-medium mx-auto max-w-xl">
                  <span className="opacity-70 text-xs block mb-1 uppercase tracking-wider font-bold">Petunjuk Arti:</span> 
                  "{currentQ.answerTranslation}"
                </div>
              )}

              {difficulty === 'mudah' && gameType === 'susun_arti_perkata' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-900 text-sm font-medium mx-auto max-w-xl">
                  <span className="opacity-70 text-xs block mb-1 uppercase tracking-wider font-bold">Petunjuk Ayat (Perkata):</span> 
                  <div className="flex flex-wrap-reverse justify-center gap-2 mt-2" dir="rtl">
                    {currentQ.answerText.split(' ').map((word: string, i: number) => (
                      <span key={i} className="bg-white px-3 py-1 rounded-lg border border-amber-200 font-arabic text-lg shadow-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Papan Susun (Jawaban User) */}
              <div className={`min-h-[140px] p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-wrap justify-center gap-4 items-center`} dir={gameType === 'susun_kata' ? 'rtl' : 'ltr'}>
                {arrangedWords.length === 0 && <span className="text-slate-400 my-auto text-sm font-bold italic uppercase tracking-wider">Ketuk kata di bawah untuk merangkai {gameType === 'susun_kata' ? 'ayat' : 'arti'}...</span>}
                {arrangedWords.map((word, idx) => (
                   <button 
                    key={idx} disabled={feedback !== null}
                    onClick={() => {
                      setArrangedWords(prev => prev.filter(w => w.id !== word.id));
                      setScrambledWords(prev => [...prev, word]);
                    }}
                    className={`relative px-5 py-3 ${gameType === 'susun_kata' ? 'bg-blue-900 border-blue-950 font-arabic text-2xl sm:text-3xl' : 'bg-amber-500 border-amber-600 font-bold text-lg'} hover:bg-rose-500 text-white border-b-4 hover:border-rose-600 active:border-b-0 active:translate-y-1 rounded-xl shadow-sm transition-all`}
                  >
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-blue-900 text-[10px] font-black rounded-full flex items-center justify-center border border-blue-200 shadow-sm z-10">
                      {idx + 1}
                    </span>
                    {word.text}
                  </button>
                ))}
              </div>

              {/* Papan Kata Acak */}
              <div className={`p-6 bg-white border border-slate-100 rounded-[2rem] flex flex-wrap justify-center gap-4 shadow-sm`} dir={gameType === 'susun_kata' ? 'rtl' : 'ltr'}>
                {scrambledWords.map((word) => (
                  <button 
                    key={word.id} disabled={feedback !== null}
                    onClick={() => {
                      setScrambledWords(prev => prev.filter(w => w.id !== word.id));
                      setArrangedWords(prev => [...prev, word]);
                    }}
                    className={`px-5 py-3 bg-white border-2 border-b-4 border-slate-200 hover:border-amber-400 hover:text-blue-900 text-slate-800 active:border-b-2 active:translate-y-0.5 ${gameType === 'susun_kata' ? 'font-arabic text-2xl sm:text-3xl' : 'font-bold text-lg'} rounded-xl transition-all`}
                  >
                    {word.text}
                  </button>
                ))}
              </div>

              {!feedback && arrangedWords.length === (gameType === 'susun_kata' ? currentQ.answerText : currentQ.answerTranslation).trim().replace(/\s{2,}/g, ' ').split(' ').length && (
                <button 
                  onClick={gameType === 'susun_kata' ? checkSusunKata : checkSusunArti} 
                  className="w-full mt-6 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 text-blue-950 font-black rounded-2xl shadow-lg transition-all text-lg uppercase tracking-wider"
                >
                  Periksa Jawaban
                </button>
              )}
            </div>
          )}

          {/* GAME 5: LANJUT AYAT SUARA */}
          {gameType === 'lanjut_ayat_suara' && (
            <div className="space-y-8 text-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Gunakan Suara untuk Melanjutkan Ayat</h3>
              
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  {isListening && (
                    <div className="absolute inset-0 -m-4 flex items-center justify-center">
                      <div className="w-full h-full rounded-full border-4 border-rose-500/30 animate-ping"></div>
                      <div className="absolute inset-0 flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-rose-500 rounded-full animate-pulse" 
                            style={{ height: `${20 + Math.random() * 40}%`, animationDelay: `${i * 0.1}s` }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button 
                    disabled={feedback !== null || isListening}
                    onClick={startListening}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-b-8 active:border-b-0 active:translate-y-2 relative z-10 ${
                      isListening 
                        ? 'bg-rose-500 border-rose-700' 
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 hover:from-emerald-400 hover:to-emerald-500'
                    } text-white`}
                  >
                    <Mic className={`w-12 h-12 ${isListening ? 'animate-bounce' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className={`text-sm font-bold uppercase tracking-widest ${isListening ? 'text-rose-500' : 'text-slate-400'}`}>
                    {isListening ? "Mendengarkan..." : "Klik tombol di atas lalu bicara"}
                  </p>
                  
                  {voiceError && (
                    <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-bold flex flex-col gap-2 animate-shake">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{voiceError}</span>
                      </div>
                      <p className="text-[10px] opacity-70 font-medium">Tips: Gunakan browser Chrome atau Edge, dan pastikan koneksi internet aktif.</p>
                    </div>
                  )}

                  {transcript && (
                    <div className="mt-4 p-6 bg-white rounded-3xl border-2 border-emerald-100 w-full max-w-md mx-auto shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between mb-3 border-b border-emerald-50 pb-2">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Hasil Analisis Suara Pro</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                        </div>
                      </div>
                      <p className="font-arabic text-2xl sm:text-3xl text-blue-900 leading-relaxed" dir="rtl">{transcript}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK BANNER (Benar/Salah) */}
          {feedback && (
            <div className={`mt-8 p-6 rounded-[2rem] border-2 flex flex-col sm:flex-row items-center gap-4 sm:justify-between animate-in fade-in slide-in-from-bottom-4 ${
              feedback === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 w-full">
                <div className={`p-3 rounded-full shadow-sm ${feedback === 'correct' ? 'bg-emerald-200 text-emerald-600' : 'bg-rose-200 text-rose-600'}`}>
                  {feedback === 'correct' ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <h4 className={`text-xl font-black ${feedback === 'correct' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {feedback === 'correct' ? 'Sempurna! Alhamdulillah.' : 'Kurang Tepat, Jangan Menyerah!'}
                  </h4>
                  {feedback === 'incorrect' && (gameType === 'susun_kata' || gameType === 'susun_arti_perkata' || gameType === 'lanjut_ayat_suara') && (
                     <div className="mt-4 bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                       <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-3">
                         {gameType === 'susun_arti_perkata' ? 'Susunan yang Benar:' : 'Ayat yang Benar:'}
                       </p>
                       {gameType === 'susun_arti_perkata' ? (
                         <p className="text-lg font-bold text-rose-900">{currentQ.answerTranslation}</p>
                       ) : (
                         <div className="space-y-4">
                           <p className="text-2xl sm:text-3xl font-arabic text-rose-900 leading-[2.2]" dir="rtl">{currentQ.answerText}</p>
                           {currentQ.answerAudio && (
                             <button 
                               onClick={() => {
                                 const audio = new Audio(currentQ.answerAudio);
                                 audio.play();
                               }}
                               className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-200 transition-all"
                             >
                               <Volume2 className="w-4 h-4" />
                               Dengarkan Koreksi
                             </button>
                           )}
                         </div>
                       )}
                     </div>
                  )}
                </div>
                <button 
                  onClick={handleNext}
                  className={`mt-4 sm:mt-0 w-full sm:w-auto px-8 py-4 rounded-2xl font-black transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                    feedback === 'correct' 
                      ? 'bg-blue-900 border-blue-950 hover:bg-blue-800 text-white' 
                      : 'bg-rose-500 border-rose-600 hover:bg-rose-400 text-white'
                  }`}
                >
                  {currentIndex < questions.length - 1 ? "Lanjut" : "Selesai"} 
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const finalScore = Math.round((score / questions.length) * 100);
    
    const gameTypeLabels: Record<string, string> = {
      'lanjut_ayat': 'Lanjut Ayat',
      'lanjut_ayat_suara': 'Lanjut Ayat (Suara)',
      'susun_kata': 'Susun Kata',
      'susun_arti_perkata': 'Susun Arti Perkata',
      'tebak_surat': 'Tebak Nama Surat',
      'tebak_arti': 'Tebak Arti Ayat'
    };
    
    return (
      <div className="max-w-md mx-auto space-y-4">
        {/* Sertifikat Container */}
        <div id="result-card" className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl relative">
          
          {/* Header Sertifikat - Navy & Gold */}
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-center py-8 px-6 text-white relative border-b-[6px] border-amber-500">
            <div className="absolute inset-0 opacity-10 bg-slate-900 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <Award className="w-14 h-14 mx-auto mb-4 text-amber-400 relative z-10 drop-shadow-md" />
            <h1 className="text-2xl font-black tracking-widest relative z-10 drop-shadow-sm text-white uppercase">Rapor Tahfidz</h1>
            <p className="text-amber-200 mt-2 relative z-10 font-bold tracking-widest uppercase text-[10px] bg-blue-950/50 border border-amber-400/30 inline-block px-3 py-1 rounded-full shadow-sm">
              {gameTypeLabels[gameType]} • Level: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-slate-50/50">
            <div className="text-center mb-6">
              <div className={`text-6xl font-black mb-1 drop-shadow-sm ${finalScore >= 80 ? 'text-amber-500' : finalScore >= 50 ? 'text-blue-500' : 'text-rose-500'}`}>
                {finalScore}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nilai Akhir</div>
            </div>

            <div className="space-y-3 bg-white p-4 sm:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nama</span>
                <span className="font-black text-slate-800 text-base">{studentName}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Kelas</span>
                <span className="font-black text-slate-800 text-base">{studentClass}</span>
              </div>
              <div className="flex justify-between items-end border-b border-dashed border-slate-100 pb-2">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hafalan</span>
                <span className="font-black text-slate-800 text-right max-w-[60%] leading-tight text-sm">
                  Juz {selectedJuz} <br/><span className="text-[10px] text-blue-800">{selectedSurah !== "all" ? `Surat ke-${selectedSurah}` : 'Semua Surat'}</span>
                </span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Jawaban Benar</span>
                <span className="font-black text-amber-500 text-lg">{score} <span className="text-[10px] text-slate-400">dari {questions.length}</span></span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 font-medium leading-relaxed px-2">
                {finalScore >= 80 ? '🎉 Masya Allah! Hafalanmu sangat kuat. Terus pertahankan prestasimu!' : 
                 finalScore >= 50 ? '👍 Bagus! Sedikit lagi murajaah pasti bisa dapat nilai sempurna.' :
                 '💪 Tetap semangat! Terus perbanyak murajaah agar hafalan semakin lancar.'}
              </p>
            </div>

            {/* Screenshot Instruction / Alhamdulillah Message */}
            <div className="mt-4 pb-4 text-center px-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 relative group">
                <p className={`transition-all duration-300 ${showAlhamdulillah ? 'text-blue-900 font-black text-base italic' : 'text-slate-500 text-[10px] font-medium italic'}`}>
                  {showAlhamdulillah 
                    ? "Alhamdulillah, saya telah menyelesaikan ujian tahfidz" 
                    : "*screenshot hasil kamu sebagai bukti kamu sudah menyelesaikan ujian tahfidz*"}
                </p>
                <button 
                  onClick={() => setShowAlhamdulillah(!showAlhamdulillah)}
                  className="mt-2 text-[9px] font-bold uppercase tracking-tighter text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-4"
                >
                  {showAlhamdulillah ? "HIDUP MULIA BERSAMA AL-QUR'AN" : "Sembunyikan Instruksi"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-4">
          <button 
            onClick={() => {
              setStep('setup');
              setShowAlhamdulillah(false);
            }}
            className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 text-lg border-b-4 border-blue-950 active:border-b-0 active:translate-y-1"
          >
            <RefreshCcw className="w-6 h-6" /> Main Lagi
          </button>
        </div>
      </div>
    );
  };

  // Tambahkan icon ekstra untuk desain baru
  const Star = (props: any) => (
    <svg viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 font-sans selection:bg-amber-200 selection:text-blue-950">
      <style>{`
        .font-arabic { 
          font-family: 'Amiri Quran', serif; 
          /* Memperlebar jarak antar baris agar harakat tidak berdempetan */
          line-height: 2.2 !important; 
        }
        
        body { font-family: 'Nunito', sans-serif; }
      `}</style>
      
      {step === 'setup' && renderSetup()}
      {step === 'playing' && renderPlaying()}
      {step === 'result' && renderResult()}

      <footer className="mt-12 pb-4 text-center">
        <p className="text-slate-400 text-xs sm:text-sm font-black uppercase tracking-widest">
          dibuat oleh: <span className="text-blue-900">Aminudin.S.Pd.</span>
        </p>
      </footer>
    </div>
  );
}
