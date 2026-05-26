export class RouterModule {
    /**
     * تولید روت اختصاصی برای هر مدل با پشتیبانی از Auth و سطح دسترسی
     */
    static generateEntityRoute(modelName, options = {}) {
        const fileName = modelName.toLowerCase();
        const { methods = [], useAuth = false } = options;

        // تعریف میدلورها: روت‌های خواندنی فقط لاگین می‌خواهند، روت‌های نوشتنی فقط ادمین
        const authMid = useAuth ? 'protect, ' : '';
        const adminMid = useAuth ? "protect, authorize('admin'), " : '';

        const routeTemplates = {
            create: `router.post('/', ${adminMid}${modelName}Ctrl.create);`,
            getAll: `router.get('/', ${authMid}${modelName}Ctrl.getAll);`,
            getById: `router.get('/:id', ${authMid}${modelName}Ctrl.getById);`,
            update: `router.put('/:id', ${adminMid}${modelName}Ctrl.update);`,
            delete: `router.delete('/:id', ${adminMid}${modelName}Ctrl.delete);`
        };

        const activeRoutes = methods.length > 0 
            ? methods.map(m => routeTemplates[m]).filter(Boolean)
            : Object.values(routeTemplates);

        // بخش ایمپورت‌ها: اگر Auth فعال باشد، میدلورها را ایمپورت می‌کنیم
        let imports = `import { Router } from 'express';\nimport { ${modelName}Ctrl } from '../../controllers/${fileName}.controller.js';`;
        if (useAuth) {
            imports += `\nimport { protect, authorize } from '../../middlewares/auth.middleware.js';`;
        }

        return `${imports}

const router = Router();

${activeRoutes.join('\n')}

export default router;`;
    }

    /**
     * تولید فایل اصلی روت‌ها با قابلیت اضافه کردن روت Auth
     */
    static generateIndexRoute(entities, useAuth = false) {
        let imports = entities.map(e => `import ${e.name.toLowerCase()}Routes from './routers/${e.name.toLowerCase()}.routes.js';`).join('\n');
        let uses = entities.map(e => `router.use('/${e.name.toLowerCase()}s', ${e.name.toLowerCase()}Routes);`).join('\n');

        // اگر Auth فعال باشد، روت‌های احراز هویت را هم اضافه کن
        if (useAuth) {
            imports += `\nimport authRoutes from './routers/auth.routes.js';`;
            uses += `\nrouter.use('/auth', authRoutes);`;
        }

        return `import { Router } from 'express';
${imports}

const router = Router();

${uses}

export default router;`;
    }
}
