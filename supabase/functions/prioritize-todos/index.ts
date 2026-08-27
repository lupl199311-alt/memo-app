import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Mode = "questions" | "prioritize";

type TodoInput = {
  id: string;
  text: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const priorityValues = [
  "today_first",
  "today_next",
  "schedule",
  "delegate_or_wait",
  "later"
] as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions", "summary", "items"],
  properties: {
    questions: {
      type: "array",
      items: { type: "string" }
    },
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "priority", "rank", "reason", "suggested_time", "confidence"],
        properties: {
          id: { type: "string" },
          priority: { type: "string", enum: priorityValues },
          rank: { type: "number" },
          reason: { type: "string" },
          suggested_time: { type: "string" },
          confidence: { type: "number" }
        }
      }
    }
  }
};

const systemPrompt = [
  "너는 한국어 개인 업무 우선순위 코치다.",
  "사용자가 너무 많은 할일 사이에서 바로 시작할 순서를 고르게 돕는다.",
  "마감 임박, 타인에게 미치는 영향, 금전/건강/법적 리스크, 막힌 사람 수, 짧게 끝나는 확인 작업, 에너지 소모를 기준으로 판단한다.",
  "사용자를 겁주거나 비난하지 말고 단호하게 배정한다.",
  "반드시 제공된 JSON 스키마만 따른다."
].join("\n");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (req.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "POST only" } }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode: Mode = body?.mode === "prioritize" ? "prioritize" : "questions";
    const todos = normalizeTodos(body?.todos);
    const answers = cleanText(body?.answers || "", 2000);

    if (todos.length === 0) {
      return json({
        error: { code: "empty_todos", message: "아직 배정할 할일이 없어요." }
      }, 400);
    }

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      return json({
        error: {
          code: "missing_openai_key",
          message: "Supabase Edge Function secret OPENAI_API_KEY is not set."
        }
      }, 500);
    }

    const result = await callOpenAI(openAIKey, mode, todos, answers);
    return json(validateResult(result, todos, mode));
  } catch (error) {
    console.error("prioritize_todos_failed", error instanceof Error ? error.message : error);
    return json({
      error: {
        code: "priority_failed",
        message: error instanceof Error ? error.message : "AI 우선순위 정리에 실패했어요."
      }
    }, 500);
  }
});

function normalizeTodos(raw: unknown): TodoInput[] {
  if (!Array.isArray(raw)) return [];

  const todos: TodoInput[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (todos.length >= 80) break;
    const id = cleanText((item as Record<string, unknown>)?.id || "", 80);
    const text = cleanText((item as Record<string, unknown>)?.text || "", 220);
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    todos.push({ id, text });
  }

  return todos;
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function callOpenAI(openAIKey: string, mode: Mode, todos: TodoInput[], answers: string) {
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(mode, todos, answers) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "todo_priority_review",
          strict: true,
          schema: responseSchema
        }
      },
      reasoning: { effort: "low" },
      max_output_tokens: 1400,
      store: false
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed: ${response.status}`);
  }

  return parseOpenAIOutput(payload);
}

function buildUserPrompt(mode: Mode, todos: TodoInput[], answers: string): string {
  const priorityGuide = [
    "priority 값은 다음 중 하나다.",
    "today_first: 오늘 가장 먼저 처리",
    "today_next: 오늘 다음으로 처리",
    "schedule: 날짜/시간을 잡아야 함",
    "delegate_or_wait: 연락하거나 답을 기다릴 일",
    "later: 오늘 밀어도 되는 일"
  ].join("\n");

  if (mode === "questions") {
    return [
      "아래 할일들의 우선순위를 정하기 전에 꼭 필요한 확인 질문만 한국어로 최대 3개 작성하라.",
      "이미 충분히 판단 가능하면 questions는 빈 배열로 둔다.",
      "summary는 빈 문자열, items는 빈 배열로 둔다.",
      priorityGuide,
      JSON.stringify({ todos })
    ].join("\n\n");
  }

  return [
    "아래 할일을 오늘 처리 순서로 배정하라.",
    "모든 todo id를 items에 정확히 한 번씩 포함하고, rank는 1부터 시작해 가장 먼저 할 일일수록 낮게 둔다.",
    "reason은 사용자가 바로 납득할 수 있게 한국어 한 문장으로 짧게 쓴다.",
    "summary는 오늘의 전체 진행 방향을 한국어 한 문장으로 쓴다.",
    priorityGuide,
    JSON.stringify({ todos, answers })
  ].join("\n\n");
}

function parseOpenAIOutput(payload: Record<string, unknown> | null) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return JSON.parse(payload.output_text);
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray((item as Record<string, unknown>)?.content)
      ? (item as Record<string, unknown>).content as Record<string, unknown>[]
      : [];
    for (const part of content) {
      const text = part?.text;
      if ((part?.type === "output_text" || part?.type === "text") && typeof text === "string") {
        return JSON.parse(text);
      }
    }
  }

  throw new Error("OpenAI response did not include structured output.");
}

function validateResult(result: Record<string, unknown>, todos: TodoInput[], mode: Mode) {
  const questions = Array.isArray(result?.questions)
    ? result.questions.map((question) => cleanText(question, 160)).filter(Boolean).slice(0, 3)
    : [];

  if (mode === "questions") {
    return { questions, summary: "", items: [] };
  }

  const todoIds = new Set(todos.map((todo) => todo.id));
  const usedIds = new Set<string>();
  const items = [];

  if (Array.isArray(result?.items)) {
    for (const item of result.items) {
      const raw = item as Record<string, unknown>;
      const id = cleanText(raw?.id || "", 80);
      const priority = cleanText(raw?.priority || "", 40);
      if (!todoIds.has(id) || usedIds.has(id)) continue;
      usedIds.add(id);
      items.push({
        id,
        priority: priorityValues.includes(priority as typeof priorityValues[number])
          ? priority
          : "later",
        rank: Number.isFinite(Number(raw?.rank)) ? Number(raw.rank) : items.length + 1,
        reason: cleanText(raw?.reason || "", 120),
        suggested_time: cleanText(raw?.suggested_time || "", 80),
        confidence: Number.isFinite(Number(raw?.confidence)) ? Number(raw.confidence) : 0.5
      });
    }
  }

  for (const todo of todos) {
    if (usedIds.has(todo.id)) continue;
    items.push({
      id: todo.id,
      priority: "later",
      rank: items.length + 1,
      reason: "정보가 부족해 낮게 배정했어요.",
      suggested_time: "나중",
      confidence: 0.2
    });
  }

  items.sort((a, b) => a.rank - b.rank);

  return {
    questions: [],
    summary: cleanText(result?.summary || "우선순위 배정 완료", 220),
    items
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
