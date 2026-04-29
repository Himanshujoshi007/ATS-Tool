import mongoose from 'mongoose';
import multer from 'multer';
import * as pdfjs from 'pdfjs-dist';

const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection cache for serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      bufferCommands: false,
    }).then((mongoose) => mongoose);
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  linkedin: String,
  score: Number,
  fileName: String,
  date: { type: Date, default: Date.now }
});
const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

async function extractData(buffer) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  let hiddenLinkedIn = "No Link Found";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(" ");

    const annotations = await page.getAnnotations();
    const linkObj = annotations.find(ann => ann.subtype === 'Link' && ann.url && ann.url.includes('linkedin.com'));
    if (linkObj) hiddenLinkedIn = linkObj.url;
  }

  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@gmail\.com/i);
  const phoneMatch = fullText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  return {
    email: emailMatch ? emailMatch[0] : "Not Found",
    phone: phoneMatch ? phoneMatch[0] : "Not Found",
    linkedin: hiddenLinkedIn
  };
}

// Self-hosted config for Express
// No bodyParser config needed - Express handles this natively

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const data = await new Promise((resolve, reject) => {
      upload.single('resume')(req, res, (err) => {
        if (err) reject(err);
        else resolve({ file: req.file, body: req.body });
      });
    });

    const { file, body } = data;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const extracted = await extractData(file.buffer);
    
    const newLead = new Lead({
      name: body.name || "Unknown",
      email: extracted.email,
      phone: extracted.phone,
      linkedin: extracted.linkedin,
      score: body.score,
      fileName: file.originalname
    });

    await newLead.save();
    console.log("🚀 New Lead Saved:", newLead.name);
    
    return res.status(200).json({ success: true, data: newLead });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};