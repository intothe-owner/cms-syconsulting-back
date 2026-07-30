import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/generate-page', async (req: Request, res: Response) => {
  try {
    const { prompt, targetType, currentContent } = req.body;
    console.log(process.env.GEMINI_API_KEY);
    // 💡 이미지 생성 시 Pollinations API를 활용하도록 규칙 추가
    let systemInstruction = `당신은 웹 페이지 빌더 도우미입니다. 사용자의 요청을 분석하여 아래 JSON 배열 형식으로만 응답하세요.
    
    [규칙]
    1. 텍스트는 "TEXT" 타입에 HTML로 작성하세요. (필요 시 inline-style을 포함해도 됩니다)
    2. 💡 [핵심] 이미지(사진, 그림 등)가 필요한 경우, 절대로 <img> 태그를 쓰지 말고 "IMAGE" 타입 객체를 따로 분리하세요.
       이때 content 속성에는 이미지를 상세하게 묘사하는 **정확한 영문 프롬프트**를 작성하여 아래 URL 구조로 반환하세요.
       형식: "https://image.pollinations.ai/prompt/{여기에_영문_프롬프트_입력}?width=800&height=600&nologo=true"
       예시: "https://image.pollinations.ai/prompt/a%20beautiful%20corporate%20office%20interior?width=800&height=600&nologo=true"
    3. 일반적인 응답은 [{"type": "TEXT", "content": "..."}, {"type": "IMAGE", "content": "https://..."}] 처럼 배열이어야 합니다.`;

    let finalPrompt = prompt;

    // 타겟(수정 영역)에 따라 프롬프트 컨텍스트를 다르게 주입
    if (targetType === 'TEXT') {
        systemInstruction += `\n\n[텍스트 수정 모드] 주어진 기존 텍스트를 사용자의 요청에 맞게 변경하여 단일 "TEXT" 객체로 반환하세요.`;
        finalPrompt = `기존 내용:\n${currentContent}\n\n수정 요청:\n${prompt}`;
    } else if (targetType === 'IMAGE') {
        systemInstruction += `\n\n[이미지 변경 모드] 사용자의 요청에 맞는 새로운 이미지 URL을 단일 "IMAGE" 객체로 반환하세요.`;
        finalPrompt = `새로운 이미지 요청:\n${prompt}`;
    } else if (targetType === 'CONTAINER') {
        systemInstruction += `\n\n[섹션(컨테이너) 수정 모드] 기존 블록의 맥락을 유지하면서, 사용자의 추가/수정 요청을 반영하여 엘리먼트 배열을 재구성하세요.`;
        finalPrompt = `기존 내용 데이터:\n${currentContent}\n\n섹션 수정 요청:\n${prompt}`;
    }else if (targetType === 'META') {
        systemInstruction += `\n\n[페이지 헤더 메타 모드] 사용자의 요청을 바탕으로 페이지 상단에 들어갈 짧고 강렬한 '배경 제목(TEXT)' 1개와, 그에 어울리는 '배경 이미지(IMAGE)' 1개를 반환하세요. 텍스트에는 절대로 HTML 태그를 포함하지 마세요.`;
        finalPrompt = `기존 헤더 정보:\n${currentContent}\n\n헤더(제목+배경) 변경 요청:\n${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction
      }
    });

    const elementsData = JSON.parse(response.text || "[]");
    res.status(200).json({ success: true, elements: elementsData });
  } catch (error) {
    console.error("Gemini API 호출 실패:", error);
    const err = error as any;
    
    // 💡 503 에러 (서버 혼잡) 처리
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