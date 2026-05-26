export class ConfigModule {
    static generateDBConfig() {
        return `import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const dbUri = process.env.MONGO_URI;
        if (!dbUri) throw new Error("MONGO_URI is not defined in .env file");
        
        const conn = await mongoose.connect(dbUri);
        console.log(\`MongoDB Connected: \${conn.connection.host}\`);
    } catch (error) {
        console.error(\`Error: \${error.message}\`);
        process.exit(1);
    }
};

export default connectDB;`;
    }
}
