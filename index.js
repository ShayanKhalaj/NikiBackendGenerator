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
  console.log(
    chalk.gray("--- Niki: Advanced Clean Architecture Generator (v1.0) ---\n")
  );

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
        { name: "1. Init: Create a sample niki.config.json", value: "init" },
        { name: "2. Create: Quick project scaffolding", value: "create" },
        { name: "3. Build: Create project from config file", value: "build" },
        { name: "4. Add Model: Add a new model to current project", value: "add:model" },
        { name: "5. Remove Model: Remove an existing model", value: "remove:model" },
        { name: "6. Wizard: Step-by-step interactive setup", value: "wizard" },
        { name: "7. Start: Run project with npm start", value: "start" },
        { name: "8. Run Dev: Run project with npm run dev", value: "run dev" },
        { name: "9. Help", value: "help" },
        { name: "10. Exit", value: "exit" },
      ],
    },
  ]);

  await handleCommand(action, []);
}

async function handleCommand(command, flags = []) {
  switch (command) {
    case "init":
      await createConfigFile();
      break;

    case "create":
      await handleCreate(flags);
      break;

    case "build":
      await buildFromConfig();
      break;

    case "add:model":
      await handleAddModel();
      break;

    case "remove:model":
      await handleRemoveModel();
      break;

    case "wizard":
      await runWizard();
      break;

    case "start":
      await startProject(false);
      break;

    case "run":
      if (flags[0] === "dev") {
        await startProject(true);
      } else {
        console.log(chalk.red(`\nUnknown run command: "${flags[0] || ""}"\n`));
        showHelp();
        process.exit(1);
      }
      break;

    case "help":
      showHelp();
      break;

    case "exit":
      console.log(chalk.yellow("\nGoodbye from Niki!\n"));
      process.exit(0);
      break;

    default:
      console.log(chalk.red(`\nUnknown command: "${command}"\n`));
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  console.log(chalk.cyan("\nNiki CLI Usage:"));
  console.log("  niki init             Create a sample niki.config.json");
  console.log("  niki create           Quick project generator (--no-auth to disable auth)");
  console.log("  niki build            Build project from niki.config.json");
  console.log("  niki add:model        Add a new model to existing project");
  console.log("  niki remove:model     Remove a model from project");
  console.log("  niki wizard           Start Niki interactive wizard");
  console.log("  niki start            Run project with npm start");
  console.log("  niki run dev          Run project with npm run dev");
  console.log("  niki help             Show this help\n");
}

async function createConfigFile() {
  const configPath = path.join(process.cwd(), "niki.config.json");

  if (fs.existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt([
      { type: "confirm", name: "overwrite", message: "Config already exists. Overwrite?", default: false },
    ]);
    if (!overwrite) return;
  }

  const template = {
    project: { name: "my-niki-api", port: 5000 },
    database: { uri: "mongodb://localhost:27017/niki_db" },
    auth: { enabled: true },
    security: { enabled: true },
    entities: [
      {
        name: "Product",
        fields: [{ name: "title", type: "String", required: true }],
        repositoryMethods: ["create", "getAll", "getById", "update", "delete"],
      },
    ],
  };

  fs.writeFileSync(configPath, JSON.stringify(template, null, 4));
  console.log(chalk.green(`\n✔ Config created: ${configPath}\n`));
}

async function handleCreate(flags = []) {
  const answers = await inquirer.prompt([
    { type: "input", name: "name", message: "Project Name:", default: "niki-app" },
    { type: "number", name: "port", message: "Port:", default: 5000 },
    { type: "input", name: "uri", message: "MongoDB URI:", default: "mongodb://localhost:27017/niki_db" },
  ]);

  let useAuth;
  if (flags.includes("--no-auth")) {
    useAuth = false;
  } else if (flags.includes("--auth")) {
    useAuth = true;
  } else {
    const res = await inquirer.prompt([
      { type: "confirm", name: "auth", message: "Enable Authentication (JWT)?", default: true },
    ]);
    useAuth = res.auth;
  }

  const { security } = await inquirer.prompt([
    { type: "confirm", name: "security", message: "Enable Security (Helmet, CORS, Rate Limit)?", default: true },
  ]);

  const config = {
    project: { name: answers.name, port: answers.port },
    database: { uri: answers.uri },
    auth: { enabled: useAuth },
    security: { enabled: security },
    entities: [],
  };

  await executeGeneration(config);
}

async function buildFromConfig() {
  const configPath = path.join(process.cwd(), "niki.config.json");

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red("\n✘ Error: niki.config.json not found. Run `niki init` first.\n"));
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    await executeGeneration(config);
  } catch (err) {
    console.log(chalk.red(`\n✘ Invalid JSON in config: ${err.message}\n`));
  }
}

async function handleAddModel() {
  const { modelName } = await inquirer.prompt([
    { type: "input", name: "modelName", message: "Model Name (e.g. Order):" },
  ]);

  if (!modelName.trim()) {
    console.log(chalk.red("✘ Model name cannot be empty."));
    return;
  }

  const fields = [];
  let addMore = true;

  while (addMore) {
    const field = await inquirer.prompt([
      { type: "input", name: "name", message: "Field Name:" },
      { type: "list", name: "type", message: "Field Type:", choices: ["String", "Number", "Boolean", "Date", "mongoose.Schema.Types.ObjectId"] },
      { type: "confirm", name: "required", message: "Required?", default: false },
      { type: "confirm", name: "more", message: "Add another field?", default: false },
    ]);
    fields.push({ name: field.name, type: field.type, required: field.required });
    addMore = field.more;
  }

  const spinner = ora(`Adding model "${modelName}"...`).start();
  try {
    await addModel(process.cwd(), modelName, fields);
    spinner.succeed(chalk.green(`Model "${modelName}" added successfully!`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
  }
}

async function handleRemoveModel() {
  const { modelName } = await inquirer.prompt([
    { type: "input", name: "modelName", message: "Model Name to remove:" },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: chalk.red(`Are you sure? This deletes all files for "${modelName}"!`),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray("Cancelled."));
    return;
  }

  const spinner = ora(`Removing model "${modelName}"...`).start();
  try {
    await removeModel(process.cwd(), modelName);
    spinner.succeed(chalk.yellow(`Model "${modelName}" removed.`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
  }
}

async function runWizard() {
  const projectInfo = await inquirer.prompt([
    { type: "input", name: "name", message: "Project Name:", default: "my-niki-api" },
    { type: "number", name: "port", message: "Port:", default: 5000 },
    { type: "input", name: "uri", message: "MongoDB URI:", default: "mongodb://localhost:27017/niki_db" },
  ]);

  const features = await inquirer.prompt([
    { type: "confirm", name: "enableAuth", message: "Enable Authentication (JWT)?", default: true },
    { type: "confirm", name: "enableSecurity", message: "Enable Security (Helmet, CORS, Rate Limit)?", default: true },
  ]);

  const entities = [];
  let addMoreEntity = true;

  while (addMoreEntity) {
    const { entityName } = await inquirer.prompt([
      { type: "input", name: "entityName", message: "Model Name (e.g. Product):" },
    ]);

    const fields = [];
    let addMoreField = true;

    while (addMoreField) {
      const field = await inquirer.prompt([
        { type: "input", name: "name", message: "  Field Name:" },
        { type: "list", name: "type", message: "  Field Type:", choices: ["String", "Number", "Boolean", "Date", "mongoose.Schema.Types.ObjectId"] },
        { type: "confirm", name: "required", message: "  Required?", default: false },
        { type: "confirm", name: "more", message: "  Add another field?", default: false },
      ]);
      fields.push({ name: field.name, type: field.type, required: field.required });
      addMoreField = field.more;
    }

    const { methods } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "methods",
        message: "CRUD methods to generate:",
        choices: ["create", "getAll", "getById", "update", "delete"],
        default: ["create", "getAll", "getById", "update", "delete"],
      },
    ]);

    entities.push({ name: entityName, fields, repositoryMethods: methods });

    const { next } = await inquirer.prompt([
      { type: "confirm", name: "next", message: "Add another model?", default: false },
    ]);
    addMoreEntity = next;
  }

  const config = {
    project: { name: projectInfo.name, port: projectInfo.port },
    database: { uri: projectInfo.uri },
    auth: { enabled: features.enableAuth },
    security: { enabled: features.enableSecurity },
    entities,
  };

  const { save } = await inquirer.prompt([
    { type: "confirm", name: "save", message: "Save config to niki.config.json?", default: true },
  ]);

  if (save) {
    fs.writeFileSync(
      path.join(process.cwd(), "niki.config.json"),
      JSON.stringify(config, null, 4)
    );
    console.log(chalk.green("✔ Config saved.\n"));
  }

  await executeGeneration(config);
}

async function executeGeneration(config) {
  const spinner = ora("Niki is generating your Clean Architecture...").start();
  const projectRoot = process.cwd();

  try {
    const result = await makeProject(projectRoot, config);

    if (result.success) {
      spinner.succeed(chalk.green(`\n✔ Project architecture generated successfully!`));
      console.log(chalk.cyan(`📍 Generation Location: ${projectRoot}`));
      console.log(chalk.white("\nCommands you can run now:"));
      console.log(chalk.gray("  niki start     (Runs node src/server.js)"));
      console.log(chalk.gray("  niki run dev   (Runs nodemon src/server.js)\n"));
    } else {
      spinner.fail(chalk.red(`Generation failed: ${result.error}`));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Critical Error: ${err.message}`));
  }
}

async function startProject(isDev = false) {
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    console.log(chalk.red("\n✘ package.json not found in current directory.\n"));
    return;
  }

  try {
    const cmd = isDev ? "npm run dev" : "npm start";
    console.log(chalk.cyan(`\n▶ Running: ${cmd}\n`));
    execSync(cmd, { cwd, stdio: "inherit" });
  } catch (err) {
    console.log(chalk.red(`\n✘ Failed to run project: ${err.message}\n`));
  }
}

runCLI().catch((err) => {
  console.error(chalk.red("\nNiki Critical Error:"), err);
  process.exit(1);
});
