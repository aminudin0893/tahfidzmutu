/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
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
  const [mainTab, setMainTab] = useState('exam'); // 'exam' or 'quran'
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
  
  // Quran Menu State
  const [quranSurah, setQuranSurah] = useState(1);
  const [quranAyahs, setQuranAyahs] = useState<any[]>([]);
  const [selectedAyahIdx, setSelectedAyahIdx] = useState(0);
  const [quranFeedback, setQuranFeedback] = useState<{status: 'idle' | 'correct' | 'incorrect', text: string}>({status: 'idle', text: ''});
  const [isQuranFetching, setIsQuranFetching] = useState(false);
  const [isVerifyingAI, setIsVerifyingAI] = useState(false);
  
  // Playing State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null); 
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Khusus untuk Game 2 (Susun Kata)
  const [scrambledWords, setScrambledWords] = useState<any[]>([]);
  const [arrangedWords, setArrangedWords] = useState<any[]>([]);
  const [showAlhamdulillah, setShowAlhamdulillah] = useState(false);
  const [timeLeft, setTimeLeft] = useState(80);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.lang = 'ar-SA';
      
      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let allAlternatives: string[] = [];
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            // Ambil alternatif dari hasil final terakhir
            const alternatives = Array.from(event.results[i]).map((r: any) => r.transcript);
            allAlternatives = [...new Set([...allAlternatives, ...alternatives])];
          } else {
            // Interim results untuk feedback visual
            setTranscript(event.results[i][0].transcript);
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
          setTranscripts(prev => [...new Set([...prev, ...allAlternatives])]);
        }
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
      
      const sortedData = mergedData.sort((a: any, b: any) => a.number - b.number);
      setJuzData(sortedData);
      
      const surahMap = new Map();
      sortedData.forEach((ayah: any) => {
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
    if (step === 'playing' && gameType === 'lanjut_ayat_suara' && transcripts.length > 0 && !isListening && !isVerifyingAI) {
      checkVoiceAnswerMulti(transcripts);
    }
  }, [transcripts, isListening, step, gameType, isVerifyingAI]);

  useEffect(() => {
    if (step === 'playing' && difficulty === 'sulit' && !feedback) {
      setTimeLeft(80);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            playBuzzer();
            setFeedback('incorrect');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, step, difficulty, feedback]);

  useEffect(() => {
    if (mainTab === 'quran') {
      setIsQuranFetching(true);
      fetch(`https://api.alquran.cloud/v1/surah/${quranSurah}/ar.alafasy`)
        .then(res => res.json())
        .then(data => {
          setQuranAyahs(data.data.ayahs);
          setSelectedAyahIdx(0);
          setQuranFeedback({status: 'idle', text: ''});
          setTranscript('');
          setIsQuranFetching(false);
        })
        .catch(err => {
          console.error("Gagal mengambil data Surah", err);
          setIsQuranFetching(false);
        });
    }
  }, [quranSurah, mainTab]);

  useEffect(() => {
    if (mainTab === 'quran' && transcripts.length > 0 && !isListening && !isVerifyingAI) {
      checkQuranReading(transcripts);
    }
  }, [transcripts, isListening, mainTab, isVerifyingAI]);

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

    if (!juzData || juzData.length === 0) {
      alert("Data Al-Quran belum dimuat atau gagal dimuat. Silakan tunggu sebentar atau segarkan halaman.");
      return;
    }

    const nQuestions = isNaN(numQuestions) || numQuestions <= 0 ? 5 : numQuestions;

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

    if (validPrompts.length < nQuestions) {
      alert(`Hanya ada ${validPrompts.length} kemungkinan soal di target ini. Mohon kurangi jumlah soal.`);
      return;
    }

    const shuffled = [...validPrompts].sort(() => 0.5 - Math.random());
    const selectedPrompts = shuffled.slice(0, nQuestions);

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
    setTranscripts([]);
    setIsPlayingAudio(false);
    if (difficulty === 'sulit') setTimeLeft(80);
    setStep('playing');
  };

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    
    // 1. Dasar: Hapus harakat/diakritik & spasi berlebih
    let normalized = text.trim().replace(/\s{2,}/g, ' ');
    // Regex lebih lengkap untuk semua tanda baca/diakritik Arab (Harakat, Tajweed marks, dll)
    normalized = normalized.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
    
    // 2. Hapus tanda baca, angka, & karakter non-huruf Arab & Tatweel
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟ـ﴿﴾\d\u0660-\u0669]/g, "");
    
    // 3. Normalisasi Karakter (Alif, Ya, Ta Marbuta, Waw, Hamza)
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/[يى]/g, 'ي');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ؤ/g, 'و');
    normalized = normalized.replace(/ئ/g, 'ي');
    
    // 4. Menghapus Basmalah di awal ayat jika ada (lebih agresif)
    const basmalahPatterns = [
      /^بسم الله الرحمن الرحيم\s*/,
      /^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/,
      /^بسم الله\s*/,
      /^الم\s*/, // Kadang STT salah tangkap pembukaan
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
    if (recognition) {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
        return;
      }
      
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

  const checkVoiceAnswerMulti = async (voiceTexts: string[]) => {
    if (feedback) return;
    const currentQ = questions[currentIndex];
    const normalizedCorrect = normalizeArabic(currentQ.answerText);
    const tightCorrect = normalizedCorrect.replace(/\s/g, '');
    const wordsCorrect = normalizedCorrect.split(/\s+/).filter(w => w.length > 0);

    // Cek setiap alternatif hasil suara (Logika Cepat)
    for (const voiceText of voiceTexts) {
      const normalizedVoice = normalizeArabic(voiceText);
      const tightVoice = normalizedVoice.replace(/\s/g, '');
      const wordsVoice = normalizedVoice.split(/\s+/).filter(w => w.length > 0);

      // 1. Exact Match
      if (normalizedVoice === normalizedCorrect || tightVoice === tightCorrect) {
        playDing();
        setFeedback('correct');
        setScore(prev => prev + 1);
        setTranscripts([]);
        return;
      }

      // 2. Similarity & Inclusion
      const intersection = wordsVoice.filter(w => wordsCorrect.includes(w));
      const similarity = intersection.length / Math.max(wordsVoice.length, wordsCorrect.length);
      
      const wordsPresentCount = wordsCorrect.filter(w => wordsVoice.includes(w)).length;
      const coverage = wordsPresentCount / wordsCorrect.length;

      if (
        normalizedVoice.includes(normalizedCorrect) || 
        normalizedCorrect.includes(normalizedVoice) ||
        tightVoice.includes(tightCorrect) ||
        tightCorrect.includes(tightVoice) ||
        similarity > 0.6 ||
        coverage > 0.75
      ) {
        playDing();
        setFeedback('correct');
        setScore(prev => prev + 1);
        setTranscripts([]);
        return;
      }
    }

    // Jika logika cepat gagal, gunakan Gemini AI (Logika Super Canggih)
    setIsVerifyingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Sebagai ahli Al-Quran profesional, verifikasi apakah bacaan pengguna (berdasarkan transkrip STT) sudah benar sesuai dengan ayat target.
          Abaikan kesalahan kecil dari mesin Speech-to-Text (STT) atau variasi fonetik yang wajar.
          
          Ayat Target: "${currentQ.answerText}"
          Transkrip Suara (STT): "${voiceTexts.join(' | ')}"
          
          Berikan jawaban dalam format JSON:
          {
            "isCorrect": boolean,
            "feedback": string
          }
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["isCorrect", "feedback"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      if (result.isCorrect) {
        playDing();
        setFeedback('correct');
        setScore(prev => prev + 1);
      } else {
        playBuzzer();
        setFeedback('incorrect');
      }
    } catch (error) {
      console.error("AI Exam Verification error", error);
      playBuzzer();
      setFeedback('incorrect');
    } finally {
      setIsVerifyingAI(false);
      setTranscripts([]);
    }
  };

  const checkVoiceAnswer = (voiceText: string) => {
    checkVoiceAnswerMulti([voiceText]);
  };

  const checkQuranReading = async (voiceTexts: string[]) => {
    const targetAyah = quranAyahs[selectedAyahIdx];
    if (!targetAyah) return;

    const normalizedCorrect = normalizeArabic(targetAyah.text);
    const tightCorrect = normalizedCorrect.replace(/\s/g, '');
    const wordsCorrect = normalizedCorrect.split(/\s+/).filter(w => w.length > 0);

    for (const voiceText of voiceTexts) {
      const normalizedVoice = normalizeArabic(voiceText);
      const tightVoice = normalizedVoice.replace(/\s/g, '');
      const wordsVoice = normalizedVoice.split(/\s+/).filter(w => w.length > 0);

      // Metrik 1: Jaccard Similarity (Irisan kata)
      const intersection = wordsVoice.filter(w => wordsCorrect.includes(w));
      const similarity = intersection.length / Math.max(wordsVoice.length, wordsCorrect.length);
      
      // Metrik 2: Coverage (Berapa banyak kata benar yang ada di suara)
      const wordsPresentCount = wordsCorrect.filter(w => wordsVoice.includes(w)).length;
      const coverage = wordsPresentCount / wordsCorrect.length;

      if (
        normalizedVoice === normalizedCorrect || 
        tightVoice === tightCorrect ||
        normalizedVoice.includes(normalizedCorrect) ||
        normalizedCorrect.includes(normalizedVoice) ||
        similarity > 0.6 ||
        coverage > 0.75
      ) {
        playDing();
        setQuranFeedback({status: 'correct', text: voiceText});
        setTranscripts([]);
        return;
      }
    }

    // Jika logika cepat gagal, gunakan "Super Advanced" Gemini AI untuk verifikasi profesional
    setIsVerifyingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Sebagai ahli Al-Quran profesional, verifikasi apakah bacaan pengguna (berdasarkan transkrip STT) sudah benar sesuai dengan ayat target.
          Abaikan kesalahan kecil dari mesin Speech-to-Text (STT) atau variasi fonetik yang wajar.
          
          Ayat Target: "${targetAyah.text}"
          Transkrip Suara (STT): "${voiceTexts.join(' | ')}"
          
          Berikan jawaban dalam format JSON:
          {
            "isCorrect": boolean,
            "feedback": string (penjelasan singkat jika salah, atau pujian jika benar)
          }
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["isCorrect", "feedback"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      if (result.isCorrect) {
        playDing();
        setQuranFeedback({status: 'correct', text: voiceTexts[0]});
      } else {
        playBuzzer();
        setQuranFeedback({status: 'incorrect', text: voiceTexts[0]});
        if (targetAyah.audio) {
          const audio = new Audio(targetAyah.audio);
          audio.play();
        }
      }
    } catch (error) {
      console.error("AI Verification error", error);
      // Fallback ke incorrect jika AI gagal
      playBuzzer();
      setQuranFeedback({status: 'incorrect', text: voiceTexts[0]});
      if (targetAyah.audio) {
        const audio = new Audio(targetAyah.audio);
        audio.play();
      }
    } finally {
      setIsVerifyingAI(false);
      setTranscripts([]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
      setIsPlayingAudio(false);
      setTranscript('');
      setTranscripts([]);
      if (difficulty === 'sulit') setTimeLeft(80);
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
          SMP Muhammadiyah 1 Probolinggo
        </p>
      </div>

      {/* Tab Switcher - Compact & Responsive */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5">
        <button 
          onClick={() => setMainTab('exam')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${mainTab === 'exam' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Award className="w-4 h-4" /> Ujian
        </button>
        <button 
          onClick={() => setMainTab('quran')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${mainTab === 'quran' ? 'bg-white text-blue-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Book className="w-4 h-4" /> Al-Quran AI
        </button>
      </div>

      {mainTab === 'exam' ? (
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
      ) : (
        <div className="p-6 sm:p-10 space-y-8 bg-white">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Surah</h3>
            <select 
              value={quranSurah} onChange={e => setQuranSurah(parseInt(e.target.value))}
              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-800 font-bold outline-none focus:border-amber-400 transition-all text-sm"
            >
              {ALL_SURAHS.map((name, i) => (
                <option key={i+1} value={i+1}>{i+1}. {name}</option>
              ))}
            </select>
          </div>

          {isQuranFetching ? (
            <div className="py-20 text-center">
              <RefreshCcw className="w-10 h-10 animate-spin mx-auto text-amber-500 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Memuat Ayat...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Baca & Koreksi AI</h3>
                <div className="flex gap-2">
                  <button 
                    disabled={selectedAyahIdx === 0}
                    onClick={() => {setSelectedAyahIdx(prev => prev - 1); setQuranFeedback({status: 'idle', text: ''}); setTranscript('');}}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center">
                    Ayat {selectedAyahIdx + 1} / {quranAyahs.length}
                  </span>
                  <button 
                    disabled={selectedAyahIdx === quranAyahs.length - 1}
                    onClick={() => {setSelectedAyahIdx(prev => prev + 1); setQuranFeedback({status: 'idle', text: ''}); setTranscript('');}}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-8 sm:p-12 bg-gradient-to-b from-slate-50 to-white rounded-[2.5rem] border border-slate-100 shadow-inner text-center relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => {
                       const audio = new Audio(quranAyahs[selectedAyahIdx]?.audio);
                       audio.play();
                     }}
                     className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-blue-600 hover:text-blue-800"
                   >
                     <Volume2 className="w-5 h-5" />
                   </button>
                </div>
                <p className="text-4xl sm:text-5xl font-arabic text-slate-800 leading-[2.2] drop-shadow-sm" dir="rtl">
                  {quranAyahs[selectedAyahIdx]?.text}
                </p>
              </div>

              <div className="flex flex-col items-center gap-5 py-2">
                <div className="relative">
                  {isListening && (
                    <div className="absolute inset-0 -m-4 flex items-center justify-center">
                      <div className="w-full h-full rounded-full border-4 border-blue-500/30 animate-ping"></div>
                    </div>
                  )}
                  <button 
                    onClick={startListening}
                    disabled={isVerifyingAI}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl border-b-8 active:border-b-0 active:translate-y-2 relative z-10 transition-all ${isVerifyingAI ? 'bg-amber-500 border-amber-700' : isListening ? 'bg-rose-500 border-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 hover:scale-105'} text-white`}
                  >
                    {isVerifyingAI ? <RefreshCcw className="w-9 h-9 animate-spin" /> : isListening ? <Square className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                  </button>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  {isVerifyingAI ? "AI Sedang Memverifikasi..." : isListening ? "Membaca... Ketuk untuk Berhenti" : "Ketuk Mikrofon & Mulai Membaca"}
                </p>

                {isVerifyingAI && (
                  <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 animate-pulse">
                    <RefreshCcw className="w-3 h-3 animate-spin text-amber-600" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Analisis AI Profesional...</span>
                  </div>
                )}

                {transcript && isListening && (
                  <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-pulse">
                    <p className="font-arabic text-2xl text-blue-900 text-center" dir="rtl">{transcript}</p>
                  </div>
                )}
              </div>

              {quranFeedback.status !== 'idle' && (
                <div className={`p-6 rounded-3xl border-2 animate-in fade-in slide-in-from-bottom-4 ${quranFeedback.status === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full flex-shrink-0 ${quranFeedback.status === 'correct' ? 'bg-emerald-200 text-emerald-600' : 'bg-rose-200 text-rose-600'}`}>
                      {quranFeedback.status === 'correct' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black ${quranFeedback.status === 'correct' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {quranFeedback.status === 'correct' ? 'Bacaan Benar! Mumtaz.' : 'Ada Kesalahan pada Bacaan.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                        Hasil Suara: <span className="font-arabic text-xl text-slate-800" dir="rtl">{quranFeedback.text}</span>
                      </p>
                      
                      {quranFeedback.status === 'incorrect' && (
                        <div className="mt-4 p-3 bg-white rounded-xl border border-rose-100 flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Contoh Koreksi</p>
                            <p className="text-[10px] text-slate-400 font-medium">Audio diputar otomatis sebagai contoh</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {quranFeedback.status === 'correct' && selectedAyahIdx < quranAyahs.length - 1 && (
                    <button 
                      onClick={() => {setSelectedAyahIdx(prev => prev + 1); setQuranFeedback({status: 'idle', text: ''}); setTranscript('');}}
                      className="w-full mt-4 py-3.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                    >
                      Lanjut Ayat Berikutnya
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPlaying = () => {
    if (!questions || questions.length === 0 || !questions[currentIndex]) {
      return (
        <div className="max-w-3xl mx-auto p-10 text-center bg-white rounded-3xl shadow-xl">
          <RefreshCcw className="w-12 h-12 mx-auto mb-4 text-amber-500 animate-spin" />
          <p className="text-slate-600 font-bold">Menyiapkan soal...</p>
          <button onClick={() => setStep('setup')} className="mt-4 text-blue-600 underline">Kembali ke Pengaturan</button>
        </div>
      );
    }
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
          
          {difficulty === 'sulit' && !feedback && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 font-black transition-all ${timeLeft <= 3 ? 'bg-rose-50 border-rose-500 text-rose-600 animate-pulse' : 'bg-amber-50 border-amber-400 text-amber-600'}`}>
                <RefreshCcw className={`w-4 h-4 ${timeLeft <= 3 ? 'animate-spin' : ''}`} />
                Waktu: {timeLeft}s
              </div>
            </div>
          )}
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
                    disabled={feedback !== null || isVerifyingAI}
                    onClick={startListening}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-b-8 active:border-b-0 active:translate-y-2 relative z-10 ${
                      isVerifyingAI
                        ? 'bg-amber-500 border-amber-700'
                        : isListening 
                          ? 'bg-rose-500 border-rose-700' 
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 hover:from-emerald-400 hover:to-emerald-500'
                    } text-white`}
                  >
                    {isVerifyingAI ? <RefreshCcw className="w-12 h-12 animate-spin" /> : isListening ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className={`text-sm font-bold uppercase tracking-widest ${isVerifyingAI ? 'text-amber-600' : isListening ? 'text-rose-500' : 'text-slate-400'}`}>
                    {isVerifyingAI ? "AI Sedang Memverifikasi..." : isListening ? "Membaca... Ketuk untuk Berhenti" : "Klik tombol di atas lalu bicara"}
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
                    {feedback === 'correct' ? 'Sempurna! Alhamdulillah.' : (timeLeft === 0 ? 'Waktu Habis!' : 'Kurang Tepat, Jangan Menyerah!')}
                  </h4>
                  {feedback === 'incorrect' && timeLeft > 0 && (gameType === 'susun_kata' || gameType === 'susun_arti_perkata' || gameType === 'lanjut_ayat_suara') && (
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
              setQuestions([]);
              setCurrentIndex(0);
              setScore(0);
              setFeedback(null);
              setTranscript('');
              setTranscripts([]);
              setIsPlayingAudio(false);
              setTimeLeft(80);
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
