import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/generate-page', async (req: Request, res: Response) => {
  try {
    const { prompt, targetType, currentContent } = req.body;

    // 💡 이미지 생성 규칙 변경: URL 대신 '정확한 영문 프롬프트'만 작성하도록 지시
    let systemInstruction = `당신은 웹 페이지 빌더 도우미입니다. 사용자의 요청을 분석하여 아래 JSON 배열 형식으로만 응답하세요.
    
    [규칙]
    1. 텍스트는 "TEXT" 타입에 HTML로 작성하세요. (필요 시 inline-style 포함 가능)
    2. 이미지(사진, 그림 등)가 필요한 경우, "IMAGE" 타입 객체로 분리하고 content 속성에는 이미지를 상세하게 묘사하는 **정확한 영문 프롬프트만** 작성하세요.
    3. 일반적인 응답은 [{"type": "TEXT", "content": "..."}, {"type": "IMAGE", "content": "a high quality modern corporate office interior"}] 처럼 배열이어야 합니다.`;

    let finalPrompt = prompt;

    if (targetType === 'TEXT') {
      systemInstruction += `\n\n[텍스트 수정 모드] 주어진 기존 텍스트를 사용자의 요청에 맞게 변경하여 단일 "TEXT" 객체로 반환하세요.`;
      finalPrompt = `기존 내용:\n${currentContent}\n\n수정 요청:\n${prompt}`;
    } else if (targetType === 'IMAGE') {
      systemInstruction += `\n\n[이미지 변경 모드] 사용자의 요청에 맞는 영문 프롬프트를 단일 "IMAGE" 객체로 반환하세요.`;
      finalPrompt = `새로운 이미지 요청:\n${prompt}`;
    } else if (targetType === 'CONTAINER') {
      systemInstruction += `\n\n[섹션(컨테이너) 수정 모드] 기존 블록의 맥락을 유지하면서, 사용자의 추가/수정 요청을 반영하여 엘리먼트 배열을 재구성하세요.`;
      finalPrompt = `기존 내용 데이터:\n${currentContent}\n\n섹션 수정 요청:\n${prompt}`;
    } else if (targetType === 'META') {
      systemInstruction += `\n\n[페이지 헤더 메타 모드] 사용자의 요청을 바탕으로 페이지 상단에 들어갈 짧고 강렬한 '배경 제목(TEXT)' 1개와, 그에 어울리는 '배경 이미지 영문 프롬프트(IMAGE)' 1개를 반환하세요. 텍스트에는 절대로 HTML 태그를 포함하지 마세요.`;
      finalPrompt = `기존 헤더 정보:\n${currentContent}\n\n헤더(제목+배경) 변경 요청:\n${prompt}`;
    }

    // 1단계: Gemini를 통한 텍스트 및 이미지 프롬프트 JSON 구성
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction
      }
    });

    const elementsData = JSON.parse(response.text || "[]");

    // 2단계: IMAGE 타입 요소가 존재할 경우 Google Imagen/나노바나나 API 호출
    const processedElements = await Promise.all(
      elementsData.map(async (element: { type: string; content: string }) => {
        if (element.type === 'IMAGE' && element.content) {
          try {
            const imageResponse = await ai.models.generateImages({
              model: 'imagen-3.0-generate-002', // 이미지 생성 전용 모델
              prompt: element.content,
              config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3',
              },
            });

            const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
            if (base64ImageBytes) {
              // Base64 Data URL 형태로 변환하여 클라이언트에 전달
              return {
                ...element,
                content: `data:image/jpeg;base64,${base64ImageBytes}`
              };
            }
          } catch (imgErr) {
            console.error("Imagen 생성 실패:", imgErr);
            // 생성 실패 시 기본 대체 이미지 URL 또는 에러 처리를 적용할 수 있습니다.
          }
        }
        return element;
      })
    );

    res.status(200).json({ success: true, elements: processedElements });
  } catch (error) {
    console.error("Gemini API 호출 실패:", error);
    const err = error as any;
    
    if (err && err.status === 503) {
      return res.status(503).json({ 
        success: false, 
        message: "현재 AI 서버 접속량이 많아 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요." 
      });
    }
    res.status(500).json({ success: false, message: "AI 생성 실패" });
  }
});

export default router;