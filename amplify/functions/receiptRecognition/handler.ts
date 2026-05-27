import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Buffer } from "buffer";

// -----------------------------
// AWS Clients
// -----------------------------
const s3 = new S3Client({
  region: "ap-northeast-1",
});

const bedrock = new BedrockRuntimeClient({
  region: "ap-northeast-1",
});

// -----------------------------
// Lambda Handler
// -----------------------------
export const handler = async (event: any) => {
  console.log("=== receiptRecognition START ===");

  try {
    // -----------------------------
    // Request Body
    // -----------------------------
    const body = JSON.parse(event.body || "{}");

    const imageKey = body.imageKey;

    console.log("imageKey =", imageKey);

    if (!imageKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          errorCode: "INVALID_REQUEST",
          error: "imageKey is required",
        }),
      };
    }

    // -----------------------------
    // S3 Object取得
    // -----------------------------
    const image = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME!,

        Key: imageKey,
      }),
    );

    if (!image.Body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          errorCode: "IMAGE_NOT_FOUND",
          error: "Image body is empty",
        }),
      };
    }

    // -----------------------------
    // byte[]
    // -----------------------------
    const bytes = await image.Body.transformToByteArray();

    // -----------------------------
    // サイズチェック
    // -----------------------------
    const MAX_SIZE = 5 * 1024 * 1024;

    if (bytes.length > MAX_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          errorCode: "IMAGE_TOO_LARGE",
          error: "画像サイズが5MBを超えています",
        }),
      };
    }

    // -----------------------------
    // base64変換
    // -----------------------------
    const base64 = Buffer.from(bytes).toString("base64");

    // -----------------------------
    // Bedrock Prompt
    // -----------------------------
    const prompt = {
      anthropic_version: "bedrock-2023-05-31",

      max_tokens: 1000,

      system: `
あなたはレシート解析AIです。

画像からレシート情報を抽出してください。

必ずJSONのみ返してください。
Markdownは禁止です。
説明文は禁止です。
コードブロックは禁止です。

出力形式：

{
  "storeName": "",
  "amount": 0,
  "transactionDate": "",
  "category": "",
  "title": "",
  "description": ""
}
`,

      messages: [
        {
          role: "user",

          content: [
            {
              type: "image",

              source: {
                type: "base64",

                media_type: "image/jpeg",

                data: base64,
              },
            },

            {
              type: "text",

              text: `
このレシート画像から以下を抽出してください。

タイトル(件名)
金額（税込金額）
店舗名
支払い方法
利用日
カテゴリ
説明（メモ）

金額は数値のみ。
日付はISO形式。
カテゴリは以下から選択：

医療費
交際費
交通費
娯楽
住居費
食費
水道光熱費
生活雑費
慶弔費
租税公課
耐久消費財
通信費
美容_被服費
趣味
保険・年金
`,
            },
          ],
        },
      ],
    };

    // -----------------------------
    // Bedrock Invoke
    // -----------------------------
    const result = await bedrock.send(
      new InvokeModelCommand({
        modelId: "jp.anthropic.claude-haiku-4-5-20251001-v1:0",

        body: JSON.stringify(prompt),

        contentType: "application/json",
      }),
    );

    // -----------------------------
    // Parse Response
    // -----------------------------
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));

    const content = responseBody.content?.[0]?.text ?? "";

    console.log("RAW =", content);

    // -----------------------------
    // markdown除去
    // -----------------------------
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // -----------------------------
    // JSON Parse
    // -----------------------------
    const parsed = JSON.parse(cleaned);

    // -----------------------------
    // Success
    // -----------------------------
    return {
      statusCode: 200,

      body: JSON.stringify({
        ok: true,

        data: {
          storeName: parsed.storeName ?? "",

          amount: parsed.amount ?? 0,

          transactionDate: parsed.transactionDate ?? "",

          category: parsed.category ?? "other",

          title: parsed.title ?? "",

          description: parsed.description ?? "",
        },
      }),
    };
  } catch (e: any) {
    console.error("ERROR =", e);

    // -----------------------------
    // Bedrock Validation
    // -----------------------------
    if (e?.name === "ValidationException") {
      return {
        statusCode: 400,

        body: JSON.stringify({
          ok: false,

          errorCode: "VALIDATION_ERROR",

          error: "入力データが不正です",
        }),
      };
    }

    // -----------------------------
    // JSON Parse Error
    // -----------------------------
    if (e instanceof SyntaxError) {
      return {
        statusCode: 500,

        body: JSON.stringify({
          ok: false,

          errorCode: "JSON_PARSE_ERROR",

          error: "AIレスポンス解析失敗",
        }),
      };
    }

    // -----------------------------
    // Unknown
    // -----------------------------
    return {
      statusCode: 500,

      body: JSON.stringify({
        ok: false,

        errorCode: "INTERNAL_SERVER_ERROR",

        error: "サーバーエラーが発生しました",
      }),
    };
  }
};
