export class RouterModule {
    /**
     * تولید روت اختصاصی برای هر مدل با پشتیبانی از Swagger و Auth
     */
    static generateEntityRoute(modelName, options = {}) {
        const fileName = modelName.toLowerCase();
        const { useAuth = false } = options;

        const authMid = useAuth ? 'protect, ' : '';
        const adminMid = useAuth ? "protect, authorize('admin'), " : '';

        // تولید کامنت‌های Swagger برای موجودیت (Entity)
        const swaggerComments = `
/**
 * @swagger
 * components:
 *   schemas:
 *     ${modelName}:
 *       type: object
 *       properties:
 *         # فیلدها به صورت داینامیک اینجا باید توسط لوپ شما پر شوند
 */`;

        return `import { Router } from 'express';
import { ${modelName}Ctrl } from '../../controllers/${fileName}.controller.js';
${useAuth ? "import { protect, authorize } from '../../middlewares/auth.middleware.js';" : ""}

const router = Router();

router.route('/')
    .get(${authMid}${modelName}Ctrl.getAll)
    .post(${adminMid}${modelName}Ctrl.create);

router.route('/:id')
    .get(${authMid}${modelName}Ctrl.getById)
    .put(${adminMid}${modelName}Ctrl.update)
    .delete(${adminMid}${modelName}Ctrl.delete);

export default router;`;
    }

    /**
     * تولید فایل روت اصلی (src/routes/index.js)
     */
    static generateIndexRoute(entities, useAuth = false) {
        // اصلاح مسیر: از ./ استفاده می‌کنیم چون همه در پوشه routes هستند
        let imports = entities.map(e => `import ${e.name.toLowerCase()}Routes from './${e.name.toLowerCase()}.routes.js';`).join('\n');
        let uses = entities.map(e => `router.use('/${e.name.toLowerCase()}s', ${e.name.toLowerCase()}Routes);`).join('\n');

        if (useAuth) {
            imports += `\nimport authRoutes from './auth.routes.js';`;
            uses += `\nrouter.use('/auth', authRoutes);`;
        }

        return `import { Router } from 'express';
${imports}

const router = Router();

${uses}

export default router;`;
    }

    /**
     * این تابع جدید را به کلاس RouterModule اضافه کن تا فایل auth.routes.js را بسازد
     */
    static generateAuthRoute() {
        return `import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               fullName: { type: string }
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/login', authController.login);

export default router;`;
    }
}
