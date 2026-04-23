import { useState, useRef, useEffect } from "react";
import { analyzeTranscript, transcribeAudio, organizeByStyle, translateText } from "@/src/lib/gemini";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send, FileText, Languages, ClipboardCheck, Sparkles, Mic, Upload, X, CheckCircle2, Volume2, Timer, ListChecks, TrendingUp, Globe, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estimated time state
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((isLoading || isTranscribing) && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLoading, isTranscribing, timeLeft]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("檔案太大（上限 50MB），請提供較小的音檔或先壓縮格式。");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.warning("偵測到較大檔案 (20MB+)，處理時間會較長，請保持視窗開啟。", { duration: 5000 });
      }
      setAudioFile(file);
      setError("");
      toast.success(`已選擇檔案: ${file.name}`);
    }
  };

  const startEstimate = (seconds: number) => {
    setEstimatedSeconds(seconds);
    setTimeLeft(seconds);
  };

  const handleTranscribe = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError("");
    // Rough estimate: 5s per MB, min 5s
    const est = Math.max(5, Math.ceil(audioFile.size / (1024 * 1024) * 8));
    startEstimate(est);
    
    const transcriptionToast = toast.loading(`正在轉錄音檔中（預計約 ${est} 秒）...`);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioFile);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const result = await transcribeAudio(base64Data, audioFile.type);
          setTranscript(result || "");
          setAudioFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast.success("音檔轉錄完成！", { id: transcriptionToast });
        } catch (err) {
          toast.error("語音轉文字失敗，請重試。", { id: transcriptionToast });
          console.error(err);
        } finally {
          setIsTranscribing(false);
          setTimeLeft(0);
        }
      };
      reader.onerror = () => {
        toast.error("讀取檔案失敗。", { id: transcriptionToast });
        setIsTranscribing(false);
        setTimeLeft(0);
      };
    } catch (err) {
      toast.error("發生非預期錯誤。", { id: transcriptionToast });
      setIsTranscribing(false);
      setTimeLeft(0);
      console.error(err);
    }
  };

  const handleQuickAction = async (action: 'full' | 'bullets' | 'importance') => {
    if (!transcript.trim()) return;
    
    setIsLoading(true);
    setError("");
    startEstimate(15); // Analysis usually takes ~15s
    
    const actionLabel = action === 'full' ? "深度分析" : action === 'bullets' ? "條列整理" : "重要度區分";
    const analysisToast = toast.loading(`正在進行${actionLabel}中...`);
    
    try {
      let result = "";
      if (action === 'full') {
        result = await analyzeTranscript(transcript);
      } else {
        result = await organizeByStyle(transcript, action);
      }
      setAnalysis(result || "處理失敗，請重試。");
      toast.success(`${actionLabel}完成！`, { id: analysisToast });
    } catch (err) {
      setError("發生錯誤，請檢查網路連線。");
      toast.error("處理失敗，請檢查網路連線。", { id: analysisToast });
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeLeft(0);
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!analysis) return;
    
    setIsLoading(true);
    startEstimate(10);
    const translationToast = toast.loading(`正在翻譯為 ${lang}...`);
    
    try {
      const result = await translateText(analysis, lang);
      setAnalysis(result || "翻譯失敗。");
      toast.success(`已成功翻譯為 ${lang}！`, { id: translationToast });
    } catch (err) {
      toast.error("翻譯失敗，請重試。", { id: translationToast });
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeLeft(0);
    }
  };

  const clearInput = () => {
    setTranscript("");
    setAnalysis("");
    setError("");
    setAudioFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("內容已清除");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <Toaster position="top-center" richColors />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              會議錄音分析助理 Pro
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              深度音檔轉文字、多樣化內容整理與全球語言通
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <Badge variant="outline" className="bg-white dark:bg-slate-900">
              Powered by Gemini AI
            </Badge>
            {(isLoading || isTranscribing) && (
              <div className="flex items-center gap-2 text-indigo-600 font-mono text-sm">
                <Timer className="h-4 w-4 animate-pulse" />
                預計剩餘: {timeLeft}s
              </div>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 outline-none">
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-lg">輸入與整理</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearInput}
                    className="text-slate-500 hover:text-slate-900 h-8"
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    重置
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 overflow-auto">
                {/* Audio Upload Area */}
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-3 relative overflow-hidden">
                  <AnimatePresence>
                    {isTranscribing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4"
                      >
                        <div className="flex items-end gap-1 h-8">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [8, 32, 12, 24, 8] }}
                              transition={{ 
                                duration: 0.8, 
                                repeat: Infinity, 
                                delay: i * 0.1,
                                ease: "easeInOut"
                              }}
                              className="w-1.5 bg-indigo-600 rounded-full"
                            />
                          ))}
                        </div>
                        <div className="flex flex-col items-center gap-1 text-indigo-600 font-medium">
                          <div className="flex items-center gap-2 animate-pulse">
                            <Volume2 className="h-4 w-4" />
                            <span>正在轉錄語音...</span>
                          </div>
                          <span className="text-xs opacity-70">預計剩餘 {timeLeft} 秒</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Mic className="h-4 w-4" />
                      音檔轉文字
                    </div>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    {!audioFile ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8"
                        disabled={isTranscribing}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        選擇音檔
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="max-w-[150px] truncate">
                          {audioFile.name}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => {
                            setAudioFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          disabled={isTranscribing}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {audioFile && (
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 shadow-sm"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          正在轉錄中...
                        </>
                      ) : (
                        "開始轉錄並提取文字"
                      )}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      內容預覽
                    </label>
                    {transcript && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {transcript.length} 字
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <Textarea
                      placeholder="音檔完成轉文字後內容會出現在此，或直接貼上逐字稿..."
                      className="min-h-[250px] lg:min-h-[400px] resize-none border-slate-200 focus-visible:ring-indigo-500 bg-white dark:bg-slate-900 transition-all"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      disabled={isTranscribing}
                    />
                    {transcript && !isTranscribing && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Organization Styles Section */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">文字整理選項</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickAction('bullets')}
                      disabled={!transcript.trim() || isLoading || isTranscribing}
                      className="h-12 flex flex-col items-center justify-center gap-0 text-xs"
                    >
                      <ListChecks className="h-4 w-4 mb-1" />
                      條列式筆記
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickAction('importance')}
                      disabled={!transcript.trim() || isLoading || isTranscribing}
                      className="h-12 flex flex-col items-center justify-center gap-0 text-xs"
                    >
                      <TrendingUp className="h-4 w-4 mb-1" />
                      重要度區分
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full py-7 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md hover:shadow-xl group"
                  disabled={!transcript.trim() || isLoading || isTranscribing}
                  onClick={() => handleQuickAction('full')}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        深度分析中...
                      </div>
                      <span className="text-[10px] opacity-70 mt-1">預計剩餘 {timeLeft} 秒</span>
                    </div>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      一鍵全方位分析整理
                    </>
                  )}
                </Button>
                {error && (
                  <p className="text-sm text-red-500 text-center font-medium animate-pulse">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Output Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
              {isLoading && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden z-20">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: estimatedSeconds, ease: "linear" }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              )}
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-lg">整理結果</CardTitle>
                  </div>
                  {analysis && (
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {analysis.length} 字
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-6 bg-white dark:bg-slate-950">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-32 w-full" />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ) : analysis ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="prose prose-slate dark:prose-invert max-w-none"
                    >
                      <ReactMarkdown 
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-8 mb-4 border-b pb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mt-4 mb-2" {...props} />,
                          p: ({node, ...props}) => <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-4 text-slate-600 dark:text-slate-400" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          hr: ({node, ...props}) => <hr className="my-8 border-slate-200 dark:border-slate-800" {...props} />,
                        }}
                      >
                        {analysis}
                      </ReactMarkdown>
                    </motion.div>
                  ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100">
                        <Languages className="h-12 w-12 opacity-20" />
                      </div>
                      <p className="text-center max-w-[280px]">
                        尚未有分析結果。請在左側輸入文字或上傳音檔，並選擇您需要的整理功能。
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>

              {analysis && !isLoading && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      翻譯此結果
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTranslate("英文")} className="text-[10px] h-7">英文</Button>
                      <Button variant="outline" size="sm" onClick={() => handleTranslate("日文")} className="text-[10px] h-7">日文</Button>
                      <Button variant="outline" size="sm" onClick={() => handleTranslate("韓文")} className="text-[10px] h-7">韓文</Button>
                      <Button variant="outline" size="sm" onClick={() => handleTranslate("繁體中文")} className="text-[10px] h-7">繁中</Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis);
                        toast.success("已複製到剪貼簿！");
                      }}
                      className="gap-2 h-9 text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      複製完整內容
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm pb-8">
          <p>© 2024 會議錄音分析助理 Pro | 提升您的工作效率</p>
        </footer>
      </div>
    </div>
  );
}
