import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

// --- Konfigurasi Awal ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("starter/docs"));

// Konfigurasi Multer untuk menyimpan file sementara di memori
const upload = multer({ storage: multer.memoryStorage() });

// Inisialisasi Google Generative AI
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

/**
 * Mengubah buffer file menjadi part yang dapat digunakan oleh Gemini API.
 * @param {Buffer} buffer - Buffer dari file gambar.
 * @param {string} mimeType - Tipe MIME dari file.
 * @returns {object} Objek part untuk Gemini API.
 */
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// --- Endpoint Utama ---

app.post("/api/generate", upload.single("image"), async (req, res) => {
  // 1. Validasi Input
  if (!req.file) {
    return res.status(400).json({ message: "File gambar tidak ditemukan." });
  }

  const { instructions, captionType } = req.body;

  try {
    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

    // 3. Prompt Engineering yang Lebih Baik
    const prompt = `
      Anda adalah seorang ahli media sosial yang kreatif.
      Analisis gambar ini dan buatlah konten untuk postingan media sosial.

      Tugas Anda:
      1.  Buat 3 opsi caption yang menarik dengan tone "${captionType}".
      2.  Buat 10 hashtag yang relevan dengan gambar.
      
      Instruksi tambahan dari pengguna: "${
        instructions || "Tidak ada instruksi tambahan."
      }"

      Format output HARUS dalam bentuk JSON yang valid, seperti ini, dan tidak ada teks lain di luar JSON:
      {
        "captions": [
          { "text": "...", "tone": "${captionType}" },
          { "text": "...", "tone": "${captionType}" },
          { "text": "...", "tone": "${captionType}" }
        ],
        "hashtags": ["#contoh1", "#contoh2", ...]
      }
    `;

    // 4. Panggil API Gemini
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
    });

    // Dapatkan objek respons yang sebenarnya
    let text;
    if (result && result.response) {
      text = result.response.text();
    } else {
      throw new Error("Unexpected response structure from Gemini API.");
    }

    // 5. Parsing dan Kirim Respons
    try {
      // Coba parse teks respons sebagai JSON
      const jsonData = JSON.parse(text);
      res.status(200).json(jsonData);
    } catch (parseError) {
      console.error("Error parsing JSON dari Gemini:", parseError);
      console.error("Teks mentah dari Gemini:", text);
      // Jika gagal parse, berarti AI tidak mengembalikan JSON yang valid.
      res.status(500).json({
        message: "Gagal mem-parsing respons dari AI. Coba lagi.",
        rawText: text, // Kirim teks mentah untuk debugging di client jika perlu
      });
    }
  } catch (error) {
    // 6. Penanganan Error
    console.error("Error saat menghubungi Gemini API:", error);
    res.status(500).json({
      message:
        error.message || "Terjadi masalah di server saat memproses gambar.",
    });
  }
});

// --- Menjalankan Server ---
app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
