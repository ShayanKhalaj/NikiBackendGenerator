export class RepositoryModule {
    static generate(modelName, options = {}) {
        const fileName = modelName.toLowerCase();
        const { methods = [], customMethods = [] } = options;

        const methodTemplates = {
            create: `    async create(data) { return await this.model.create(data); }`,
            update: `    async updateById(id, data) { return await this.model.findByIdAndUpdate(id, data, { new: true }); }`,
            softDelete: `    async softDelete(id) { return await this.model.findByIdAndUpdate(id, { isDeleted: true }, { new: true }); }`,
            getById: `    async getById(id) { return await this.model.findOne({ _id: id, isDeleted: false }); }`,
            getAll: `    async getAll(filter = {}) { 
        return await this.model.find({ ...filter, isDeleted: false }); 
    }`
        };

        const activeMethods = methods.length > 0 
            ? methods.map(m => methodTemplates[m]).filter(Boolean)
            : Object.values(methodTemplates);

        return `import { ${modelName}Model } from '../models/schemas/${fileName}.schema.js';

class ${modelName}Repository {
    constructor() {
        this.model = ${modelName}Model;
    }

${activeMethods.join('\n\n')}

${customMethods.join('\n\n')}
}

export const ${modelName}Repo = new ${modelName}Repository();`;
    }
}
