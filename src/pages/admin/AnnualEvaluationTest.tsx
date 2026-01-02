import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  UserCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  ANNUAL_EVALUATION_QUESTIONS,
  SCORE_MAP,
  calculateTotalScore,
  calculatePercentage,
  getRatingLabel,
} from '@/lib/annualEvaluationQuestions';

type ViewMode = 'staff-form' | 'supervisor-form' | 'result';

export default function AnnualEvaluationTest() {
  const [viewMode, setViewMode] = useState<ViewMode>('staff-form');
  const [staffAnswers, setStaffAnswers] = useState<Record<string, number>>({});
  const [supervisorAnswers, setSupervisorAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Staff form handlers
  const handleStaffAnswer = (questionId: string, tahap: number) => {
    setStaffAnswers((prev) => ({ ...prev, [questionId]: tahap }));
  };

  // Supervisor form handlers
  const handleSupervisorAnswer = (questionId: string, tahap: number) => {
    setSupervisorAnswers((prev) => ({ ...prev, [questionId]: tahap }));
  };

  const currentQuestion = ANNUAL_EVALUATION_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === ANNUAL_EVALUATION_QUESTIONS.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Calculate scores
  const staffTotal = calculateTotalScore(staffAnswers);
  const staffPercentage = calculatePercentage(staffAnswers);
  const supervisorTotal = calculateTotalScore(supervisorAnswers);
  const supervisorPercentage = calculatePercentage(supervisorAnswers);
  const staffRating = getRatingLabel(staffPercentage);
  const supervisorRating = getRatingLabel(supervisorPercentage);

  // Radar data
  const radarData = ANNUAL_EVALUATION_QUESTIONS.map((q) => ({
    subject: q.shortLabel,
    staff: staffAnswers[q.id] || 0,
    supervisor: supervisorAnswers[q.id] || 0,
    fullMark: 5,
  }));

  // Pre-fill with sample data
  const fillSampleData = () => {
    const sampleStaff: Record<string, number> = {};
    const sampleSupervisor: Record<string, number> = {};
    ANNUAL_EVALUATION_QUESTIONS.forEach((q) => {
      sampleStaff[q.id] = Math.floor(Math.random() * 3) + 3; // 3-5
      sampleSupervisor[q.id] = Math.floor(Math.random() * 3) + 3; // 3-5
    });
    setStaffAnswers(sampleStaff);
    setSupervisorAnswers(sampleSupervisor);
  };

  const resetAll = () => {
    setStaffAnswers({});
    setSupervisorAnswers({});
    setCurrentQuestionIndex(0);
    setViewMode('staff-form');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Annual Evaluation Test Page</h1>
            <p className="text-muted-foreground">
              Simulation page for testing UI - no database connection
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fillSampleData}>
              Fill Sample Data
            </Button>
            <Button variant="outline" onClick={resetAll}>
              Reset All
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="staff-form" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Staff Self-Evaluation
            </TabsTrigger>
            <TabsTrigger value="supervisor-form" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Supervisor Evaluation
            </TabsTrigger>
            <TabsTrigger value="result" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Result View
            </TabsTrigger>
          </TabsList>

          {/* Staff Form */}
          <TabsContent value="staff-form" className="space-y-6">
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <CardTitle>Penilaian Kendiri - Kakitangan</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-blue-100">
                    Soalan {currentQuestionIndex + 1} / {ANNUAL_EVALUATION_QUESTIONS.length}
                  </Badge>
                </div>
                <CardDescription>
                  Simulasi borang penilaian kendiri untuk kakitangan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Progress */}
                <div className="mb-6">
                  <div className="flex gap-1">
                    {ANNUAL_EVALUATION_QUESTIONS.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`h-2 flex-1 rounded-full transition-colors cursor-pointer ${
                          staffAnswers[q.id]
                            ? 'bg-blue-500'
                            : idx === currentQuestionIndex
                            ? 'bg-blue-300'
                            : 'bg-gray-200'
                        }`}
                        onClick={() => setCurrentQuestionIndex(idx)}
                      />
                    ))}
                  </div>
                </div>

                {/* Current Question */}
                <div className="space-y-6">
                  <div>
                    <Badge className="mb-2">{currentQuestion.category}</Badge>
                    <h3 className="text-xl font-semibold mb-2">{currentQuestion.shortLabel}</h3>
                    <p className="text-muted-foreground">{currentQuestion.question}</p>
                  </div>

                  <RadioGroup
                    value={staffAnswers[currentQuestion.id]?.toString() || ''}
                    onValueChange={(value) => handleStaffAnswer(currentQuestion.id, parseInt(value))}
                    className="space-y-3"
                  >
                    {currentQuestion.levels.map((level) => (
                      <div
                        key={level.tahap}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          staffAnswers[currentQuestion.id] === level.tahap
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleStaffAnswer(currentQuestion.id, level.tahap)}
                      >
                        <RadioGroupItem value={level.tahap.toString()} id={`staff-${level.tahap}`} />
                        <Label htmlFor={`staff-${level.tahap}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Tahap {level.tahap}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{level.description}</p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      disabled={isFirstQuestion}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Sebelum
                    </Button>
                    {isLastQuestion ? (
                      <Button
                        onClick={() => setViewMode('supervisor-form')}
                        disabled={Object.keys(staffAnswers).length < ANNUAL_EVALUATION_QUESTIONS.length}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Hantar & Lihat Penyelia
                      </Button>
                    ) : (
                      <Button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
                        Seterusnya
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supervisor Form */}
          <TabsContent value="supervisor-form" className="space-y-6">
            <Card className="border-green-200">
              <CardHeader className="bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <CardTitle>Penilaian Penyelia</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-100">
                    Soalan {currentQuestionIndex + 1} / {ANNUAL_EVALUATION_QUESTIONS.length}
                  </Badge>
                </div>
                <CardDescription>
                  Simulasi borang penilaian penyelia untuk kakitangan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Staff Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Menilai kakitangan:</p>
                  <p className="font-semibold">Ahmad bin Abdullah (Simulation)</p>
                  <p className="text-sm text-muted-foreground">Jabatan IT</p>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex gap-1">
                    {ANNUAL_EVALUATION_QUESTIONS.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`h-2 flex-1 rounded-full transition-colors cursor-pointer ${
                          supervisorAnswers[q.id]
                            ? 'bg-green-500'
                            : idx === currentQuestionIndex
                            ? 'bg-green-300'
                            : 'bg-gray-200'
                        }`}
                        onClick={() => setCurrentQuestionIndex(idx)}
                      />
                    ))}
                  </div>
                </div>

                {/* Current Question */}
                <div className="space-y-6">
                  <div>
                    <Badge className="mb-2 bg-green-100 text-green-800">{currentQuestion.category}</Badge>
                    <h3 className="text-xl font-semibold mb-2">{currentQuestion.shortLabel}</h3>
                    <p className="text-muted-foreground">{currentQuestion.question}</p>
                  </div>

                  {/* Show staff answer if available */}
                  {staffAnswers[currentQuestion.id] && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <User className="h-4 w-4 inline mr-1" />
                        Penilaian kendiri kakitangan: <strong>Tahap {staffAnswers[currentQuestion.id]}</strong>
                      </p>
                    </div>
                  )}

                  <RadioGroup
                    value={supervisorAnswers[currentQuestion.id]?.toString() || ''}
                    onValueChange={(value) => handleSupervisorAnswer(currentQuestion.id, parseInt(value))}
                    className="space-y-3"
                  >
                    {currentQuestion.levels.map((level) => (
                      <div
                        key={level.tahap}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          supervisorAnswers[currentQuestion.id] === level.tahap
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSupervisorAnswer(currentQuestion.id, level.tahap)}
                      >
                        <RadioGroupItem value={level.tahap.toString()} id={`sup-${level.tahap}`} />
                        <Label htmlFor={`sup-${level.tahap}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Tahap {level.tahap}</span>
                            <Badge variant="outline" className="text-xs">
                              {level.marks} markah
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{level.description}</p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      disabled={isFirstQuestion}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Sebelum
                    </Button>
                    {isLastQuestion ? (
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setViewMode('result')}
                        disabled={Object.keys(supervisorAnswers).length < ANNUAL_EVALUATION_QUESTIONS.length}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Hantar & Lihat Keputusan
                      </Button>
                    ) : (
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      >
                        Seterusnya
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Result View */}
          <TabsContent value="result" className="space-y-6">
            {/* Score Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-blue-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <CardTitle>Penilaian Kendiri (Kakitangan)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-blue-600">{staffTotal}/100</p>
                      <p className="text-lg text-muted-foreground">{staffPercentage}%</p>
                    </div>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        staffRating.color === 'green' ? 'bg-green-100 text-green-800' :
                        staffRating.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        staffRating.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        staffRating.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {staffRating.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <CardTitle>Penilaian Penyelia</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-green-600">{supervisorTotal}/100</p>
                      <p className="text-lg text-muted-foreground">{supervisorPercentage}%</p>
                    </div>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        supervisorRating.color === 'green' ? 'bg-green-100 text-green-800' :
                        supervisorRating.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        supervisorRating.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        supervisorRating.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {supervisorRating.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spider Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Carta Spider Web - Perbandingan Kompetensi</CardTitle>
                <CardDescription>
                  Perbandingan antara penilaian kendiri (biru) dan penilaian penyelia (hijau)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 5]}
                        tick={{ fontSize: 12, fontWeight: 'bold', fill: '#000000' }}
                        tickCount={6}
                      />
                      <Radar
                        name="Kakitangan"
                        dataKey="staff"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Penyelia"
                        dataKey="supervisor"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip
                        content={({ payload, label }) => {
                          if (payload && payload.length > 0) {
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg">
                                <p className="font-semibold text-sm mb-2">{label}</p>
                                {payload.map((entry: any, index: number) => (
                                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                                    {entry.name}: Tahap {entry.value}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Pecahan Markah Terperinci</CardTitle>
                <CardDescription>
                  Perbandingan markah setiap soalan antara kakitangan dan penyelia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Kompetensi</TableHead>
                      <TableHead className="text-center">Kakitangan</TableHead>
                      <TableHead className="text-center">Penyelia</TableHead>
                      <TableHead className="text-center">Perbezaan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ANNUAL_EVALUATION_QUESTIONS.map((q, index) => {
                      const staffScore = SCORE_MAP[staffAnswers[q.id]] || 0;
                      const supervisorScore = SCORE_MAP[supervisorAnswers[q.id]] || 0;
                      const difference = supervisorScore - staffScore;

                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{q.shortLabel}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {q.question}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {staffScore}/10
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {supervisorScore}/10
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-medium ${
                                difference > 0
                                  ? 'text-green-600'
                                  : difference < 0
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {difference > 0 ? '+' : ''}
                              {difference}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
