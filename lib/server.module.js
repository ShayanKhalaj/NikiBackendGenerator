export const generateServerFile = (projectName) => {
    return `import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import baseRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// اتصال به دیتابیس
connectDB();

// میدلورهای پایه
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// استفاده از روت اصلی
app.use('/api', baseRouter);

// میدلور خطای مرکزی
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(\`🚀 ${projectName} is running on http://localhost:\${PORT}\`);
});`;
};
