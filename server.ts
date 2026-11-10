import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

function fallbackParseCommand(command: string, defaultDay: string) {
  const normalized = command.toLowerCase();

  // Day detection
  let day = defaultDay;
  if (normalized.includes('pazartesi')) day = 'Pazartesi';
  else if (normalized.includes('salı') || normalized.includes('sali')) day = 'Salı';
  else if (normalized.includes('çarşamba') || normalized.includes('carsamba')) day = 'Çarşamba';
  else if (normalized.includes('perşembe') || normalized.includes('persembe')) day = 'Perşembe';
  else if (normalized.includes('cuma')) day = 'Cuma';
  else if (normalized.includes('yarın') || normalized.includes('yarin')) {
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const idx = days.indexOf(defaultDay);
    day = idx >= 0 && idx < 4 ? days[idx + 1] : 'Pazartesi';
  }

  // Lesson number detection
  let lessonNumber = 1;
  const numMatch = normalized.match(/([1-7])\.?\s*ders/);
  if (numMatch) {
    lessonNumber = parseInt(numMatch[1], 10);
  } else if (normalized.includes('ilk ders') || normalized.includes('1.') || normalized.includes('birinci')) {
    lessonNumber = 1;
  } else if (normalized.includes('2.') || normalized.includes('ikinci')) {
    lessonNumber = 2;
  } else if (normalized.includes('3.') || normalized.includes('üçüncü') || normalized.includes('ucuncu')) {
    lessonNumber = 3;
  } else if (normalized.includes('4.') || normalized.includes('dördüncü') || normalized.includes('dorduncu')) {
    lessonNumber = 4;
  } else if (normalized.includes('5.') || normalized.includes('beşinci') || normalized.includes('besinci')) {
    lessonNumber = 5;
  } else if (normalized.includes('6.') || normalized.includes('altıncı') || normalized.includes('altinci')) {
    lessonNumber = 6;
  } else if (normalized.includes('7.') || normalized.includes('yedinci') || normalized.includes('son ders')) {
    lessonNumber = 7;
  }

  // Subject title detection
  const subjects = [
    'Matematik',
    'Türkçe',
    'Fen Bilimleri',
    'Fen',
    'Sosyal Bilgiler',
    'Sosyal',
    'İngilizce',
    'Din Kültürü',
    'Beden Eğitimi',
    'Görsel Sanatlar',
    'Müzik',
    'Bilişim',
    'Tarih',
    'Coğrafya',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Felsefe',
    'Almanca',
  ];

  let newTitle: string | undefined;
  for (const sub of subjects) {
    if (new RegExp(`\\b${sub.toLowerCase()}\\b`, 'i').test(normalized)) {
      newTitle = sub;
      break;
    }
  }

  // Notes detection
  let newNotes: string | undefined;
  if (normalized.includes('ödev') || normalized.includes('odev')) {
    newNotes = 'Ödev kontrolü ve teslimi';
  } else if (normalized.includes('sınav') || normalized.includes('sinav') || normalized.includes('yazılı')) {
    newNotes = 'Ders sınavı var';
  } else if (normalized.includes('proje')) {
    newNotes = 'Proje çalışması / sunumu';
  }

  return {
    day,
    lessonNumber,
    newTitle: newTitle || `${lessonNumber}. Ders`,
    newNotes: newNotes || '',
    summary: `${day} ${lessonNumber}. ders ${newTitle || ''} olarak güncellendi.`,
  };
}

// Gemini AI voice/text Turkish school schedule parser
app.post('/api/gemini/parse-command', async (req, res) => {
  const { command, currentDay = 'Pazartesi' } = req.body;

  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: 'Komut metni girilmelidir.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful fallback to regex parser if API key is not yet configured
    const fallback = fallbackParseCommand(command, currentDay);
    res.json({ success: true, action: fallback, source: 'fallback' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `
Sen Türk okullarında kullanılan akıllı ders programı asistanısın.
Okulda haftanın günleri: "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma".
Her gün 1. dersten 7. derse kadar toplam 7 ders vardır.
Kullanıcı Türkçe sesli veya yazılı komut verir. Örneğin:
- "Salı 3. dersi Matematik yap"
- "Yarın 2. derse Biyoloji yaz, proje teslimi unutma de"
- "Cuma 5. ders İngilizce olsun"
- "Çarşamba 1. derse ödev kontrolü notunu ekle"
- "Bugün 4. ders Türkçe olsun"

Görev: Kullanıcının niyetini analiz et ve JSON formatında yapılandırılmış veriyi çıkar.
Eğer gün belirtilmemişse veya "bugün" denmişse, varsayılan gün olarak "${currentDay}" kabul et.
Eğer "yarın" denmişse "${currentDay}" gününden bir sonraki okul gününü seç.
Ders numarası 1 ile 7 arasında bir tamsayı olmalıdır.
newTitle: Yeni veya güncellenen ders adı (ör. "Matematik", "Fen Bilimleri", "Beden Eğitimi").
newNotes: Varsa ödev, sınav veya not açıklaması.
summary: Kullanıcıya gösterilecek 1 cümlelik Türkçe onay mesajı (ör. "Salı günü 3. ders Matematik olarak ayarlandı.").
`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Kullanıcı komutu: "${command}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              day: {
                type: Type.STRING,
                description: 'Pazartesi, Salı, Çarşamba, Perşembe veya Cuma',
              },
              lessonNumber: {
                type: Type.INTEGER,
                description: '1 ile 7 arasında ders numarası',
              },
              newTitle: {
                type: Type.STRING,
                description: 'Ders başlığı veya adı',
              },
              newNotes: {
                type: Type.STRING,
                description: 'Eklenen not veya açıklama',
              },
              summary: {
                type: Type.STRING,
                description: 'Kısa Türkçe bilgilendirme özeti',
              },
            },
            required: ['day', 'lessonNumber'],
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 8000)
      ),
    ]);

    const parsedJson = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      action: parsedJson,
      source: 'gemini',
    });
  } catch (error: any) {
    console.warn('Gemini çağrısı yapılamadı, akıllı yedek ayrıştırıcı devrede:', error?.message);
    const fallback = fallbackParseCommand(command, currentDay);
    res.json({
      success: true,
      action: fallback,
      source: 'fallback',
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
