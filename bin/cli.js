#!/usr/bin/env node

import { makeProject, addModel, removeModel } from "../lib/generator.lib.js";
import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import fs from "fs";
import path from "path";
import ora from "ora";

const args = process.argv.slice(2);
const cmd = args[0];

async function run() {
    console.log(chalk.magenta(figlet.textSync("Niki", { font: "Slant" })));

    switch (cmd) {
        case "init":
            await createConfig(); // حالا تعریف شده
            break;
        case "create":
            await handleCreate();
            break;
        case "build":
            await handleBuild(); // حالا تعریف شده
            break;
        case "add:model":
            await handleAddModel();
            break;
        case "remove:model":
            await handleRemoveModel();
            break;
        case "help":
        default:
            showHelp();
            break;
    }
}

/**
 * ایجاد فایل کانفیگ نمونه
 */
async function createConfig() {
    const configPath = path.join(process.cwd(), "niki.config.json");
    const template = {
        project: { name: "niki-app", port: 5000, outputPath: "./" },
        database: { uri: "mongodb://localhost:27017/niki_db" },
        auth: { enabled: true },
        security: { enabled: true },
        entities: [
            { 
                name: "Product", 
                fields: [{ name: "title", type: "String", required: true }] 
            }
        ]
    };

    fs.writeFileSync(configPath, JSON.stringify(template, null, 4));
    console.log(chalk.green(`\n✔ Created niki.config.json at: ${configPath}\n`));
}

/**
 * ساخت پروژه از روی فایل کانفیگ
 */
async function handleBuild() {
    const configPath = path.join(process.cwd(), "niki.config.json");
    if (!fs.existsSync(configPath)) {
        console.log(chalk.red("\n✘ Error: niki.config.json not found. Run 'niki init' first."));
        return;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const spinner = ora("Building project from config...").start();
        const finalPath = path.resolve(process.cwd(), config.project.outputPath || "./", config.project.name);
        
        await makeProject(finalPath, config);
        spinner.succeed(chalk.green(`Project built successfully at: ${finalPath}`));
    } catch (err) {
        console.log(chalk.red(`\n✘ Error reading config or generating: ${err.message}`));
    }
}

/**
 * هندل کردن ساخت پروژه جدید (Quick Create)
 */
async function handleCreate() {
    const questions = [
        { type: 'input', name: 'name', message: 'Project Name:', default: 'niki-app' },
        { type: 'confirm', name: 'auth', message: 'Enable Authentication?', default: true },
        { type: 'confirm', name: 'security', message: 'Enable Security (Helmet/Cors)?', default: true }
    ];

    // بررسی فلگ‌ها
    const hasAuthFlag = args.includes('--auth');
    const hasNoAuthFlag = args.includes('--no-auth');
    
    let forcedAuth = null;
    if (hasAuthFlag) forcedAuth = true;
    if (hasNoAuthFlag) forcedAuth = false;

    const answers = await inquirer.prompt(questions.filter(q => {
        if (q.name === 'auth' && forcedAuth !== null) return false;
        return true;
    }));

    const finalConfig = {
        project: { name: answers.name || "niki-app" },
        auth: { enabled: forcedAuth !== null ? forcedAuth : answers.auth },
        security: { enabled: answers.security },
        database: { uri: `mongodb://localhost:27017/${answers.name || 'niki_db'}` },
        entities: []
    };

    const spinner = ora("Creating Niki project...").start();
    try {
        const finalPath = path.join(process.cwd(), finalConfig.project.name);
        await makeProject(finalPath, finalConfig); 
        spinner.succeed(chalk.green("Project created successfully!"));
    } catch (err) {
        spinner.fail(chalk.red(err.message));
    }
}

/**
 * اضافه کردن مدل به پروژه موجود
 */
async function handleAddModel() {
    const { modelName } = await inquirer.prompt([
        { type: 'input', name: 'modelName', message: 'Enter Model Name (e.g., Product):' }
    ]);

    const spinner = ora(`Adding model ${modelName}...`).start();
    try {
        await addModel(process.cwd(), modelName);
        spinner.succeed(chalk.green(`Model ${modelName} added with CRUD layers!`));
    } catch (err) {
        spinner.fail(chalk.red(err.message));
    }
}

/**
 * حذف مدل از پروژه
 */
async function handleRemoveModel() {
    const { modelName } = await inquirer.prompt([
        { type: 'input', name: 'modelName', message: 'Which model do you want to remove?' }
    ]);

    const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: chalk.red(`Are you sure? This deletes controllers, routes, and schemas for ${modelName}!`), default: false }
    ]);

    if (confirm) {
        try {
            await removeModel(process.cwd(), modelName);
            console.log(chalk.yellow(`Model ${modelName} removed.`));
        } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
        }
    }
}

function showHelp() {
    console.log(`
    ${chalk.bold("Usage:")} niki <command> [options]

    ${chalk.cyan("Commands:")}
      init            Create a sample niki.config.json
      create          Interactive project creation
      build           Build project from niki.config.json
      add:model       Add a new model to existing project
      remove:model    Remove a model from project

    ${chalk.cyan("Options:")}
      --auth          Force enable authentication
      --no-auth       Force disable authentication
      --config <path> Use specific config file
    `);
}

run().catch(err => {
    console.error(chalk.red("FATAL ERROR:"), err);
    process.exit(1);
});
