import { Briefcase, Files, Globe2 } from "lucide-react";

interface RiskDriver {
  label: string;
  points: number;
  description: string;
}

interface RiskAnalysisProps {
  score: number;
  drivers: RiskDriver[];
}

function getRiskColor(score: number) {
  if (score >= 60) return { stroke: "#f43f5e", bg: "bg-rose-50", text: "text-rose-600", label: "High Exposure" };
  if (score >= 25) return { stroke: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600", label: "Guarded" };
  return { stroke: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", label: "Low Risk" };
}

function CircularScore({ score }: { score: number }) {
  const size = 96;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const offset = circumference * (1 - progress);
  const risk = getRiskColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={risk.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tracking-tight text-foreground">{score}</span>
        <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

const DRIVER_ICONS: Record<string, typeof Globe2> = {
  Jurisdiction: Globe2,
  "Jurisdiction signal": Globe2,
  Industry: Briefcase,
  "Industry signal": Briefcase,
  "Document Coverage": Files,
  "Documentation signal": Files,
};

export function RiskAnalysis({ score, drivers }: RiskAnalysisProps) {
  const risk = getRiskColor(score);

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-bold tracking-tight">Risk Analysis</h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${risk.bg} ${risk.text}`}>
          {risk.label}
        </span>
      </div>

      <div className="flex items-center justify-center mb-5">
        <CircularScore score={score} />
      </div>

      <div className="space-y-0 divide-y divide-border/40">
        {drivers.map((driver) => {
          const Icon = DRIVER_ICONS[driver.label] ?? Files;
          const hasPenalty = driver.points > 0;
          return (
            <div key={driver.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`flex shrink-0 size-8 items-center justify-center rounded-full ${hasPenalty ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{driver.label}</p>
                  <span className={`text-sm font-semibold tabular-nums ${hasPenalty ? "text-amber-600" : "text-muted-foreground"}`}>
                    +{driver.points}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{driver.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
