# Niki CLI

Niki CLI is a command-line tool for scaffolding and managing Node.js projects with MongoDB and a Clean Architecture structure. It can generate a complete API project, optionally include authentication and security layers, and supports adding/removing models with CRUD scaffolding.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
  - [Local development](#local-development)
  - [Global install (recommended for usage)](#global-install-recommended-for-usage)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
  - [`niki help`](#niki-help)
  - [`niki init`](#niki-init)
  - [`niki create`](#niki-create)
  - [`niki build`](#niki-build)
  - [`niki add:model`](#niki-addmodel)
  - [`niki remove:model`](#niki-removemodel)
  - [`niki wizard`](#niki-wizard)
- [Flags & Options](#flags--options)
- [Configuration File (niki.config.json)](#configuration-file-nikiconfigjson)
- [Generated Project Structure](#generated-project-structure)
- [Environment Variables (.env)](#environment-variables-env)
- [Generated API Endpoints](#generated-api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Scaffold Node.js + Express + MongoDB (Mongoose) API project
- Clean Architecture-inspired separation:
  - routes
  - controllers
  - repositories
  - schemas/models
  - middlewares
  - config
- Optional JWT Authentication (register/login/me)
- Optional security middleware (Helmet/CORS/Rate Limit)
- Build projects from a config file (`niki.config.json`)
- Add a model with CRUD scaffolding to an existing project
- Remove a model and related files safely (with confirmation)

---

## Requirements

- Node.js >= 18 (recommended)
- npm (or yarn/pnpm)
- MongoDB running locally or a MongoDB connection URI

---

## Install

### Local development
```bash
git clone https://github.com/ShayanKhalaj/NikiBackendGenerator.git
cd niki-cli
npm install
