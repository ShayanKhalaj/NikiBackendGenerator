export class ControllerModule {
    static generate(modelName, options = {}) {
        const fileName = modelName.toLowerCase();
        const { methods = [] } = options;

        const methodTemplates = {
            create: `    async create(req, res, next) {
        try {
            const item = await ${modelName}Repo.create(req.body);
            res.status(201).json(item);
        } catch (error) { next(error); }
    }`,
            getAll: `    async getAll(req, res, next) {
        try {
            const items = await ${modelName}Repo.getAll(req.query);
            res.json(items);
        } catch (error) { next(error); }
    }`,
            getById: `    async getById(req, res, next) {
        try {
            const item = await ${modelName}Repo.getById(req.params.id);
            if (!item) return res.status(404).json({ message: '${modelName} Not Found' });
            res.json(item);
        } catch (error) { next(error); }
    }`,
            update: `    async update(req, res, next) {
        try {
            const item = await ${modelName}Repo.updateById(req.params.id, req.body);
            if (!item) return res.status(404).json({ message: '${modelName} Not Found' });
            res.json(item);
        } catch (error) { next(error); }
    }`,
            delete: `    async delete(req, res, next) {
        try {
            const result = await ${modelName}Repo.softDelete(req.params.id);
            if (!result) return res.status(404).json({ message: '${modelName} Not Found' });
            res.status(204).send();
        } catch (error) { next(error); }
    }`
        };

        const activeMethods = methods.length > 0 
            ? methods.map(m => methodTemplates[m]).filter(Boolean)
            : Object.values(methodTemplates);

        return `import { ${modelName}Repo } from '../repositories/${fileName}.repository.js';

class ${modelName}Controller {
${activeMethods.join('\n\n')}
}

export const ${modelName}Ctrl = new ${modelName}Controller();`;
    }
}
