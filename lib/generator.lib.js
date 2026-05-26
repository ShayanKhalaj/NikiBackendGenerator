import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trim() + "\n", "utf-8");
}

export async function makeProject(rootPath, config) {
  try {
    // ایجاد ساختار دایرکتوری‌های پروژه داخل پوشه جاری
    const srcPath = path.join(rootPath, "src");
    const dirs = [
      srcPath,
      path.join(srcPath, "config"),
      path.join(srcPath, "models"),
      path.join(srcPath, "repositories"),
      path.join(srcPath, "controllers"),
      path.join(srcPath, "routes"),
      path.join(srcPath, "middlewares"),
      path.join(srcPath, "validations"),
    ];

    dirs.forEach(ensureDirExists);

    // ۱. ایجاد یا آپدیت package.json با اسکریپت‌های استارت صحیح
    const packageJsonPath = path.join(rootPath, "package.json");
    let pkg = {};
    if (fs.existsSync(packageJsonPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      } catch (e) {
        pkg = {};
      }
    }

    pkg.name = pkg.name || config.project.name || "niki-generated-api";
    pkg.version = pkg.version || "1.0.0";
    pkg.type = "module";
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.start = "node src/server.js";
    pkg.scripts.dev = "nodemon src/server.js";

    pkg.dependencies = pkg.dependencies || {};
    const deps = ["express", "mongoose", "dotenv", "cors", "helmet", "express-rate-limit", "joi"];
    if (config.auth?.enabled) {
      deps.push("jsonwebtoken", "bcryptjs");
    }
    deps.forEach((d) => {
      if (!pkg.dependencies[d]) pkg.dependencies[d] = "latest";
    });

    pkg.devDependencies = pkg.devDependencies || {};
    if (!pkg.devDependencies.nodemon) {
      pkg.devDependencies.nodemon = "latest";
    }

    writeFile(packageJsonPath, JSON.stringify(pkg, null, 2));

    // ۲. فایل محیطی env.
    const envContent = `
PORT=${config.project.port || 5000}
MONGO_URI=${config.database?.uri || "mongodb://localhost:27017/niki_db"}
JWT_SECRET=${config.auth?.enabled ? "niki_super_secret_key_12345!" : ""}
    `;
    writeFile(path.join(rootPath, ".env"), envContent);

    // ۳. اتصال به دیتابیس src/config/db.js
    const dbContent = `
import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(\`✔ MongoDB Connected: \${conn.connection.host}\`);
    } catch (error) {
        console.error(\`✘ Database Error: \${error.message}\`);
        process.exit(1);
    }
};
    `;
    writeFile(path.join(srcPath, "config", "db.js"), dbContent);

    // ۴. میدلویرهای سراسری و خطا src/middlewares/error.middleware.js
    const errorMwContent = `
export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};
    `;
    writeFile(path.join(srcPath, "middlewares", "error.middleware.js"), errorMwContent);

    // ۵. میدلویر احراز هویت src/middlewares/auth.middleware.js
    if (config.auth?.enabled) {
      const authMwContent = `
import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
      `;
      writeFile(path.join(srcPath, "middlewares", "auth.middleware.js"), authMwContent);
    }

    // ۶. تولید انتیتی‌ها و لایه‌های مربوطه
    if (config.entities && config.entities.length > 0) {
      for (const entity of config.entities) {
        await generateEntityFiles(srcPath, entity, config.auth?.enabled);
      }
    }

    // ۷. ساخت هاب اصلی روت‌ها src/routes/index.js
    let routesIndexContent = `import { Router } from 'express';\n`;
    if (config.entities && config.entities.length > 0) {
      config.entities.forEach((entity) => {
        const nameLower = entity.name.toLowerCase();
        routesIndexContent += `import ${nameLower}Routes from './${nameLower}.routes.js';\n`;
      });
    }
    routesIndexContent += `\nconst router = Router();\n\n`;
    if (config.entities && config.entities.length > 0) {
      config.entities.forEach((entity) => {
        const nameLower = entity.name.toLowerCase();
        routesIndexContent += `router.use('/${nameLower}s', ${nameLower}Routes);\n`;
      });
    }
    routesIndexContent += `\nexport default router;\n`;
    writeFile(path.join(srcPath, "routes", "index.js"), routesIndexContent);

    // ۸. فایل اصلی سرور src/server.js
    const serverContent = `
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { errorHandler } from './middlewares/error.middleware.js';
import apiRoutes from './routes/index.js';

dotenv.config();
connectDB();

const app = express();

${config.security?.enabled ? "app.use(helmet());\napp.use(cors());\napp.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));" : "app.use(cors());"}

app.use(express.json());

app.use('/api', apiRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
});
    `;
    writeFile(path.join(srcPath, "server.js"), serverContent);

    // ۹. اجرای خودکار npm install پس از اتمام ساختار فایل‌ها
    try {
      console.log(chalk?.cyan ? chalk.cyan("\n📦 Installing dependencies...") : "\n📦 Installing dependencies...");
      execSync("npm install", { cwd: rootPath, stdio: "inherit" });
    } catch (npmErr) {
      console.error("✘ Failed to automatically install dependencies. Please run 'npm install' manually.");
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function generateEntityFiles(srcPath, entity, authEnabled) {
  const name = entity.name;
  const nameLower = name.toLowerCase();

  // الف. تولید فیلدهای Mongoose
  const fieldsStr = entity.fields
    .map((f) => {
      return `    ${f.name}: { type: ${f.type}, required: ${f.required || false} }`;
    })
    .join(",\n");

  const modelContent = `
import mongoose from 'mongoose';

const ${name}Schema = new mongoose.Schema({
${fieldsStr}
}, { timestamps: true });

export default mongoose.model('${name}', ${name}Schema);
  `;
  writeFile(path.join(srcPath, "models", `${nameLower}.model.js`), modelContent);

  // ب. تولید لایه ریپازیتوری (Repository Pattern)
  const repoContent = `
import ${name} from '../models/${nameLower}.model.js';

export class ${name}Repository {
    async create(data) {
        return await ${name}.create(data);
    }

    async getAll() {
        return await ${name}.find({});
    }

    async getById(id) {
        return await ${name}.findById(id);
    }

    async update(id, data) {
        return await ${name}.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }

    async delete(id) {
        return await ${name}.findByIdAndDelete(id);
    }
}
  `;
  writeFile(path.join(srcPath, "repositories", `${nameLower}.repository.js`), repoContent);

  // ج. کنترلر (Controller Layer)
  const controllerContent = `
import { ${name}Repository } from '../repositories/${nameLower}.repository.js';

const repo = new ${name}Repository();

export const create${name} = async (req, res, next) => {
    try {
        const item = await repo.create(req.body);
        res.status(201).json(item);
    } catch (err) {
        next(err);
    }
};

export const getAll${name}s = async (req, res, next) => {
    try {
        const items = await repo.getAll();
        res.json(items);
    } catch (err) {
        next(err);
    }
};

export const get${name}ById = async (req, res, next) => {
    try {
        const item = await repo.getById(req.params.id);
        if (!item) return res.status(404).json({ message: '${name} not found' });
        res.json(item);
    } catch (err) {
        next(err);
    }
};

export const update${name} = async (req, res, next) => {
    try {
        const item = await repo.update(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: '${name} not found' });
        res.json(item);
    } catch (err) {
        next(err);
    }
};

export const delete${name} = async (req, res, next) => {
    try {
        const item = await repo.delete(req.params.id);
        if (!item) return res.status(404).json({ message: '${name} not found' });
        res.json({ message: '${name} deleted successfully' });
    } catch (err) {
        next(err);
    }
};
  `;
  writeFile(path.join(srcPath, "controllers", `${nameLower}.controller.js`), controllerContent);

  // د. ولیدیشن‌ها (Joi Validation Layer)
  const joiFieldsStr = entity.fields
    .map((f) => {
      let rule = `Joi.${f.type.toLowerCase() === "mongoose.schema.types.objectid" ? "string()" : f.type.toLowerCase()}()`;
      if (f.required) rule += ".required()";
      return `    ${f.name}: ${rule}`;
    })
    .join(",\n");

  const validationContent = `
import Joi from 'joi';

export const validate${name} = (data) => {
    const schema = Joi.object({
${joiFieldsStr}
    });
    return schema.validate(data);
};

export const validateMiddleware = (req, res, next) => {
    const { error } = validate${name}(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    next();
};
  `;
  writeFile(path.join(srcPath, "validations", `${nameLower}.validation.js`), validationContent);

  // ه. روت‌ها (Routes Layer)
  const protectImport = authEnabled ? "import { protect } from '../middlewares/auth.middleware.js';\n" : "";
  const protectMw = authEnabled ? "protect, " : "";

  const routesContent = `
import { Router } from 'express';
import { 
    create${name}, 
    getAll${name}s, 
    get${name}ById, 
    update${name}, 
    delete${name} 
} from '../controllers/${nameLower}.controller.js';
import { validateMiddleware } from '../validations/${nameLower}.validation.js';
${protectImport}
const router = Router();

router.route('/')
    .post(${protectMw}validateMiddleware, create${name})
    .get(getAll${name}s);

router.route('/:id')
    .get(get${name}ById)
    .put(${protectMw}validateMiddleware, update${name})
    .delete(${protectMw}delete${name});

export default router;
  `;
  writeFile(path.join(srcPath, "routes", `${nameLower}.routes.js`), routesContent);
}

// توابع مدیریت پویای مدل‌ها در پروژه موجود
export async function addModel(rootPath, modelName, fields = []) {
  const srcPath = path.join(rootPath, "src");
  if (!fs.existsSync(srcPath)) {
    throw new Error("Not a Niki project or src directory is missing.");
  }

  const entity = { name: modelName, fields };
  await generateEntityFiles(srcPath, entity, fs.existsSync(path.join(srcPath, "middlewares", "auth.middleware.js")));

  // به روز رسانی روت‌های اصلی
  const routesDir = path.join(srcPath, "routes");
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".routes.js"));
  
  let indexContent = `import { Router } from 'express';\n`;
  files.forEach((file) => {
    const nameOnly = file.replace(".routes.js", "");
    indexContent += `import ${nameOnly}Routes from './${file}';\n`;
  });

  indexContent += `\nconst router = Router();\n\n`;
  files.forEach((file) => {
    const nameOnly = file.replace(".routes.js", "");
    indexContent += `router.use('/${nameOnly}s', ${nameOnly}Routes);\n`;
  });

  indexContent += `\nexport default router;\n`;
  writeFile(path.join(routesDir, "index.js"), indexContent);
}

export async function removeModel(rootPath, modelName) {
  const srcPath = path.join(rootPath, "src");
  const nameLower = modelName.toLowerCase();

  const filesToDelete = [
    path.join(srcPath, "models", `${nameLower}.model.js`),
    path.join(srcPath, "repositories", `${nameLower}.repository.js`),
    path.join(srcPath, "controllers", `${nameLower}.controller.js`),
    path.join(srcPath, "routes", `${nameLower}.routes.js`),
    path.join(srcPath, "validations", `${nameLower}.validation.js`),
  ];

  filesToDelete.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  // بازنویسی روت‌ها
  const routesDir = path.join(srcPath, "routes");
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".routes.js"));
    
    let indexContent = `import { Router } from 'express';\n`;
    files.forEach((file) => {
      const nameOnly = file.replace(".routes.js", "");
      indexContent += `import ${nameOnly}Routes from './${file}';\n`;
    });

    indexContent += `\nconst router = Router();\n\n`;
    files.forEach((file) => {
      const nameOnly = file.replace(".routes.js", "");
      indexContent += `router.use('/${nameOnly}s', ${nameOnly}Routes);\n`;
    });

    indexContent += `\nexport default router;\n`;
    writeFile(path.join(routesDir, "index.js"), indexContent);
  }
}
