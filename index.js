#!/usr/bin/env node

import { makeProject, addModel, removeModel } from "../lib/generator.lib.js";
import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import fs from "fs";
import ora from "ora";
import { execSync } from "child_process";

async function runCLI() {
  console.clear();
  console.log(chalk.magenta(figlet.textSync("Niki", { font: "Slant" })));
  console.log(chalk.gray("--- Niki: Advanced Clean Architecture Generator (v1.0) ---\n"));

  const args = process.argv.slice(2);
  const command = args[0];

  if (command) {
    await handleCommand(command, args.slice(1));
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do with Niki?",
      choices: [
        { name: "1. Init: Create niki.config.json", value: "init" },
        { name: "2. Build: Generate project in current folder", value: "build" },
        { name: "3. Wizard: Interactive setup", value: "wizard" },
        { name: "4. Add Model: Add new model", value: "add:model" },
        { name: "5. Remove Model: Delete model", value: "remove:model" },
        { name: "6. Start: npm start", value: "start" },
        { name: "7. Run Dev: npm run dev", value: "run dev" },
        { name: "8. Help", value: "help" },
        { name: "9. Exit", value: "exit" },
      ],
    },
  ]);

  await handleCommand(action, []);
}

async function handleCommand(command, flags = []) {
  switch (command) {
    case "init": await createConfigFile(); break;
    case "build": await buildFromConfig(); break;
    case "wizard": await runWizard(); break;
    case "add:model": await handleAddModel(); break;
    case "remove:model": await handleRemoveModel(); break;
    case "start": await startProject(false); break;
    case "run": 
      if (flags[0] === "dev") await startProject(true);
      else showHelp();
      break;
    case "help": showHelp(); break;
    case "exit": process.exit(0); break;
    default: showHelp();
  }
}

async function createConfigFile() {
  const configPath = path.join(process.cwd(), "niki.config.json");
  const template = {
    project: { name: "niki-app", port: 5000 },
    database: { uri: "mongodb://localhost:27017/niki_db" },
    auth: { enabled: true },
    security: { enabled: true },
    entities: [{ name: "Product", fields: [{ name: "title", type: "String", required: true }] }]
  };
  fs.writeFileSync(configPath, JSON.stringify(template, null, 4));
  console.log(chalk.green(`\n✔ Config created at: ${configPath}\n`));
}

async function buildFromConfig() {
  const configPath = path.join(process.cwd(), "niki.config.json");
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red("\n✘ Error: niki.config.json not found. Run `niki init` first."));
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  await executeGeneration(config);
}

async function runWizard() {
  const answers = await inquirer.prompt([
    { type: "input", name: "name", message: "Project Name:", default: "niki-app" },
    { type: "number", name: "port", message: "Port:", default: 5000 },
    { type: "input", name: "dbUri", message: "MongoDB URI:", default: "mongodb://localhost:27017/niki_db" },
    { type: "confirm", name: "auth", message: "Enable Auth (JWT)?", default: true },
    { type: "confirm", name: "security", message: "Enable Security (Helmet/Rate-limit)?", default: true }
  ]);

  const config = {
    project: { name: answers.name, port: answers.port },
    database: { uri: answers.dbUri },
    auth: { enabled: answers.auth },
    security: { enabled: answers.security },
    entities: []
  };

  let addMore = true;
  while (addMore) {
    const { entityName } = await inquirer.prompt([{ type: "input", name: "entityName", message: "Model Name (e.g. User):" }]);
    if (entityName) {
      config.entities.push({ name: entityName, fields: [{ name: "title", type: "String", required: true }] });
    }
    const { confirm } = await inquirer.prompt([{ type: "confirm", name: "confirm", message: "Add another model?", default: false }]);
    addMore = confirm;
  }

  await executeGeneration(config);
}

async function handleAddModel() {
  const { name } = await inquirer.prompt([{ type: "input", name: "name", message: "Enter Model Name:" }]);
  if (!name) return;
  
  const spinner = ora(`Adding model ${name}...`).start();
  try {
    const entity = { name, fields: [{ name: "name", type: "String", required: true }] };
    addModel(process.cwd(), entity);
    spinner.succeed(chalk.green(`\n✔ Model ${name} added successfully!`));
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
  }
}

async function handleRemoveModel() {
  const { name } = await inquirer.prompt([{ type: "input", name: "name", message: "Enter Model Name to remove:" }]);
  if (!name) return;

  const spinner = ora(`Removing model ${name}...`).start();
  try {
    removeModel(process.cwd(), name);
    spinner.succeed(chalk.green(`\n✔ Model ${name} removed.`));
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
  }
}

async function executeGeneration(config) {
  const spinner = ora("Niki is generating your project...").start();
  try {
    const result = await makeProject(process.cwd(), config);
    if (result.success) {
      spinner.succeed(chalk.green(`\n✔ Project generated successfully in current directory!`));
      console.log(chalk.cyan("\nNext steps:"));
      console.log(chalk.white("  1. niki run dev  (Starts the server with nodemon)"));
      console.log(chalk.white("  2. Check 'src' folder for your code.\n"));
    } else {
      spinner.fail(chalk.red(`Generation failed: ${result.error}`));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Error: ${err.message}`));
  }
}

async function startProject(isDev = false) {
  const cmd = isDev ? "npm run dev" : "npm start";
  try {
    console.log(chalk.cyan(`\n▶ Executing: ${cmd}\n`));
    // استفاده از stdio: inherit برای دیدن لاگ‌های سرور به صورت زنده
    execSync(cmd, { cwd: process.cwd(), stdio: "inherit" });
  } catch (err) {
    console.log(chalk.red(`\n✘ Could not start project. Make sure you are in the project root and ran 'niki build'.\n`));
  }
}

function showHelp() {
  console.log(chalk.cyan("\nNiki CLI Help:"));
  console.log(chalk.white("  niki init         : Create a default niki.config.json"));
  console.log(chalk.white("  niki build        : Build project from niki.config.json"));
  console.log(chalk.white("  niki wizard       : Start interactive project setup"));
  console.log(chalk.white("  niki add:model    : Quickly add a new model/CRUD"));
  console.log(chalk.white("  niki remove:model : Remove a model and its files"));
  console.log(chalk.white("  niki start        : Run the project (node src/server.js)"));
  console.log(chalk.white("  niki run dev      : Run the project (nodemon src/server.js)"));
  console.log("");
}

runCLI().catch(err => {
    console.error(err);
    process.exit(1);
});
