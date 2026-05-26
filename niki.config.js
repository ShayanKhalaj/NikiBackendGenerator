async function createConfigFile() {
  const targetDir = process.cwd();
  const configPath = path.join(targetDir, "niki.config.json");

  try {
    if (!fs.existsSync(targetDir)) {
      console.log(chalk.red(`\n✘ Error: Target directory does not exist: ${targetDir}\n`));
      return;
    }

    if (fs.existsSync(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `\nA niki.config.json already exists in:\n${targetDir}\nOverwrite it?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow("\nCancelled. Existing config was kept.\n"));
        return;
      }
    }

    const template = {
      project: { name: "my-niki-api", port: 5000 },
      database: { uri: "mongodb://localhost:27017/niki_db" },
      auth: { enabled: true },
      security: { enabled: true },
      entities: [
        {
          name: "Product",
          fields: [
            { name: "title", type: "String", required: true },
            { name: "price", type: "Number", required: true },
          ],
          repositoryMethods: ["create", "getAll", "getById", "update", "delete"],
        },
      ],
    };

    fs.writeFileSync(configPath, JSON.stringify(template, null, 4), "utf8");
    console.log(chalk.green(`\n✔ Created niki.config.json at:\n${configPath}\n`));
  } catch (err) {
    console.log(chalk.red(`\n✘ Failed to create config file: ${err.message}\n`));
  }
}
