/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, RefreshCcw, Download, CheckCircle, 
  XCircle, BookOpen, Award, User, Settings,
  List, LayoutGrid, Book, MessageSquare, Leaf, Zap, Flame
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

  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Effects ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); }
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
    if (step === 'playing' && gameType === 'susun_kata' && questions[currentIndex]) {
      const currentQ = questions[currentIndex];
      const cleanText = currentQ.answerText.trim().replace(/\s{2,}/g, ' ');
      const words = cleanText.split(' ').map((w: string, i: number) => ({ id: i, text: w }));
      
      setScrambledWords(words.sort(() => 0.5 - Math.random()));
      setArrangedWords([]);
    }
  }, [currentIndex, step, gameType, questions]);

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
    if (gameType === 'lanjut_ayat' || gameType === 'susun_kata') {
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

      if (gameType === 'lanjut_ayat') {
        const answerAyah = juzData[globalIndex + 1];
        q.answerText = answerAyah.text;
        const allTexts = juzData.map(a => a.text);
        const distractors = getRandomDistractors(allTexts, q.answerText, numDistractors);
        q.options = [q.answerText, ...distractors].sort(() => 0.5 - Math.random());
      } 
      else if (gameType === 'susun_kata') {
        const answerAyah = juzData[globalIndex + 1];
        q.answerText = answerAyah.text;
        q.answerTranslation = answerAyah.translation;
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
    setStep('playing');
  };

  const handleAnswerMultipleChoice = (selectedAnswer: string) => {
    if (feedback) return; 
    
    const currentQ = questions[currentIndex];
    if (selectedAnswer === currentQ.answerText) {
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
    
    if (userAnswer === currentQ.answerText.trim().replace(/\s{2,}/g, ' ')) {
      playDing();
      setFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playBuzzer();
      setFeedback('incorrect');
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null);
      setIsPlayingAudio(false);
    } else {
      setStep('result');
    }
  };

  const downloadResult = () => {
    const card = document.getElementById('result-card');
    if ((window as any).html2canvas && card) {
      (window as any).html2canvas(card, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `Sertifikat-Tahfidz-${studentName.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
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
        
        <BookOpen className="w-16 h-16 mx-auto mb-4 drop-shadow-md text-amber-400 relative z-10" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight relative z-10 drop-shadow-sm">
          Tahfidz<span className="text-amber-400">Pro</span>
        </h1>
        <p className="text-blue-100 mt-3 text-sm sm:text-base font-medium relative z-10 max-w-md mx-auto">
          Platform interaktif modern untuk menguji dan memperkuat hafalan Al-Qur'an Anda.
        </p>
      </div>

      <form onSubmit={handleStart} className="p-6 sm:p-10 space-y-8 bg-white">
        {/* Identitas Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             Profil Pemain
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
                placeholder="Kelas / Grup"
              />
            </div>
          </div>
        </div>

        {/* Jenis Permainan Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Pilih Mode Tantangan
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { id: 'lanjut_ayat', icon: List, label: "Lanjut Ayat" },
              { id: 'susun_kata', icon: LayoutGrid, label: "Susun Kata" },
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
          {isFetching ? <RefreshCcw className="w-6 h-6 animate-spin" /> : "Mulai Tantangan Sekarang"}
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
            <div className="flex items-center gap-2 bg-blue-50 text-blue-900 border border-blue-100 py-1.5 px-4 rounded-full text-sm font-black shadow-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Skor: {score}
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
                <div className="py-6 px-4 w-full bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-4xl sm:text-5xl text-center leading-[2.5] font-arabic text-slate-800 drop-shadow-sm" dir="rtl">
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
                    ? "font-arabic text-3xl sm:text-4xl leading-[2.2] text-right block text-slate-800 py-2" 
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

          {/* GAME 2: SUSUN KATA */}
          {gameType === 'susun_kata' && (
            <div className="space-y-6 text-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Susun Ayat Selanjutnya</h3>
              
              {difficulty === 'mudah' && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900 text-sm font-medium mx-auto max-w-xl">
                  <span className="opacity-70 text-xs block mb-1 uppercase tracking-wider font-bold">Petunjuk Arti:</span> 
                  "{currentQ.answerTranslation}"
                </div>
              )}

              {/* Papan Susun (Jawaban User) */}
              <div className="min-h-[140px] p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-wrap-reverse justify-center gap-4 items-center" dir="rtl">
                {arrangedWords.length === 0 && <span className="text-slate-400 my-auto text-sm font-bold italic uppercase tracking-wider">Ketuk kata di bawah untuk merangkai ayat...</span>}
                {arrangedWords.map((word, idx) => (
                  <button 
                    key={idx} disabled={feedback !== null}
                    onClick={() => {
                      setArrangedWords(prev => prev.filter(w => w.id !== word.id));
                      setScrambledWords(prev => [...prev, word]);
                    }}
                    className="px-5 py-3 bg-blue-900 hover:bg-rose-500 text-white border-b-4 border-blue-950 hover:border-rose-600 active:border-b-0 active:translate-y-1 font-arabic text-3xl sm:text-4xl rounded-xl shadow-sm transition-all"
                  >
                    {word.text}
                  </button>
                ))}
              </div>

              {/* Papan Kata Acak */}
              <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex flex-wrap-reverse justify-center gap-4 shadow-sm" dir="rtl">
                {scrambledWords.map((word) => (
                  <button 
                    key={word.id} disabled={feedback !== null}
                    onClick={() => {
                      setScrambledWords(prev => prev.filter(w => w.id !== word.id));
                      setArrangedWords(prev => [...prev, word]);
                    }}
                    className="px-5 py-3 bg-white border-2 border-b-4 border-slate-200 hover:border-amber-400 hover:text-blue-900 text-slate-800 active:border-b-2 active:translate-y-0.5 font-arabic text-3xl sm:text-4xl rounded-xl transition-all"
                  >
                    {word.text}
                  </button>
                ))}
              </div>

              {!feedback && arrangedWords.length === currentQ.answerText.trim().replace(/\s{2,}/g, ' ').split(' ').length && (
                <button 
                  onClick={checkSusunKata} 
                  className="w-full mt-6 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 text-blue-950 font-black rounded-2xl shadow-lg transition-all text-lg uppercase tracking-wider"
                >
                  Periksa Jawaban
                </button>
              )}
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
                  {feedback === 'incorrect' && gameType === 'susun_kata' && (
                     <div className="mt-4 bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                       <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-3">Susunan yang Benar:</p>
                       <p className="text-2xl sm:text-3xl font-arabic text-rose-900 leading-[2.2]" dir="rtl">{currentQ.answerText}</p>
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
      'susun_kata': 'Susun Kata',
      'tebak_surat': 'Tebak Nama Surat',
      'tebak_arti': 'Tebak Arti Ayat'
    };
    
    return (
      <div className="max-w-xl mx-auto space-y-6">
        {/* Sertifikat Container */}
        <div id="result-card" className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl relative">
          
          {/* Header Sertifikat - Navy & Gold */}
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-center py-12 px-8 text-white relative border-b-[6px] border-amber-500">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            <Award className="w-20 h-20 mx-auto mb-6 text-amber-400 relative z-10 drop-shadow-md" />
            <h1 className="text-4xl font-black tracking-widest relative z-10 drop-shadow-sm text-white">RAPOR TAHFIDZ</h1>
            <p className="text-amber-200 mt-3 relative z-10 font-bold tracking-widest uppercase text-sm bg-blue-950/50 border border-amber-400/30 inline-block px-4 py-1.5 rounded-full shadow-sm">
              Mode: {gameTypeLabels[gameType]} • Level: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </p>
          </div>

          <div className="p-8 sm:p-12 bg-slate-50/50">
            <div className="text-center mb-10">
              <div className={`text-8xl font-black mb-2 drop-shadow-sm ${finalScore >= 80 ? 'text-amber-500' : finalScore >= 50 ? 'text-blue-500' : 'text-rose-500'}`}>
                {finalScore}
              </div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Skor Akhir</div>
            </div>

            <div className="space-y-4 bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-end border-b-2 border-dashed border-slate-100 pb-3">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Nama Pemain</span>
                <span className="font-black text-slate-800 text-lg">{studentName}</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-dashed border-slate-100 pb-3">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Kelas</span>
                <span className="font-black text-slate-800 text-lg">{studentClass}</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-dashed border-slate-100 pb-3">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Target</span>
                <span className="font-black text-slate-800 text-right max-w-[60%] leading-tight">
                  Juz {selectedJuz} <br/><span className="text-sm text-blue-800">{selectedSurah !== "all" ? `Surat ke-${selectedSurah}` : 'Semua Surat'}</span>
                </span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Jawaban Benar</span>
                <span className="font-black text-amber-500 text-xl">{score} <span className="text-sm text-slate-400">dari {questions.length}</span></span>
              </div>
            </div>

            <div className="mt-10 text-center">
              <p className="text-base text-slate-600 font-medium leading-relaxed px-4">
                {finalScore >= 80 ? '🎉 Masya Allah! Hafalanmu sangat kuat. Terus pertahankan prestasimu!' : 
                 finalScore >= 50 ? '👍 Bagus! Sedikit lagi murajaah pasti bisa dapat nilai sempurna.' :
                 '💪 Tetap semangat! Terus perbanyak murajaah agar hafalan semakin lancar.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button 
            onClick={() => setStep('setup')}
            className="flex-1 bg-white border-2 border-slate-200 text-blue-900 py-4 rounded-2xl font-black hover:bg-slate-50 hover:border-blue-400 transition-colors flex items-center justify-center gap-3 text-lg"
          >
            <RefreshCcw className="w-6 h-6" /> Main Lagi
          </button>
          
          <button 
            onClick={downloadResult}
            className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-3 text-lg border-b-4 border-amber-600 active:border-b-0 active:translate-y-1"
          >
            <Download className="w-6 h-6" /> Simpan Sertifikat
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
        /* Menggunakan font Amiri Quran yang didesain khusus agar harakat dan spasi Al-Quran sangat jelas */
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Nunito:wght@400;600;700;800;900&display=swap');
        
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
    </div>
  );
}
