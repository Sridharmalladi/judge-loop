# Lesson 00 — Project setup

## Why this lesson exists

Most projects fail not because the code is bad, but because the structure is wrong from the start. A real engineering team spends the first hour of any project setting up the repo, dependency management, and dev environment — before writing a single line of business logic. Skip this, and by week two you're fighting import errors and dependency conflicts instead of building features.

## Concepts to understand first

> **Claude Code:** Before we touch the terminal, quiz me on these concepts. Don't let me proceed until I can explain each one.

### 1. Monorepo vs. polyrepo
This project has a Python backend and a React frontend. We're keeping them in ONE repo (monorepo) because:
- They share types (the API contract)
- They deploy together
- It's one portfolio project, not two services

**Review question:** When would you choose separate repos instead? Give a real scenario.

### 2. Python virtual environments
Every Python project needs isolation. We use `venv` because it's built in and sufficient. You need to explain:
- What problem does a virtual environment solve?
- What happens if you `pip install` without one?
- Why is `requirements.txt` not optional?

### 3. Node package management
The frontend uses npm. You need to explain:
- What's the difference between `dependencies` and `devDependencies`?
- What does `package-lock.json` do and why is it committed to git?

### 4. Environment variables
API keys (Groq, OpenRouter, Gemini) never go in code. We use `.env` files locally and environment variables in production.
- Why not just hardcode the key during development?
- What is `.env.example` for?

---

## Build steps

> **Claude Code:** Walk me through each step. Explain what each command does. Don't just run them — make me predict what will happen first.

### Step 1: Initialize the repo

```bash
mkdir judge-loop && cd judge-loop
git init
```

**Before running:** What files does `git init` create? Where?

### Step 2: Create the directory structure

```bash
# Backend
mkdir -p backend/app/{models,adapters,engine,api,storage}
mkdir -p backend/tests
touch backend/app/__init__.py
touch backend/app/models/__init__.py
touch backend/app/adapters/__init__.py
touch backend/app/engine/__init__.py
touch backend/app/api/__init__.py
touch backend/app/storage/__init__.py

# Frontend (we'll use Vite + React + TypeScript)
# Don't create manually — we'll use the Vite scaffolding tool in lesson 06

# Config files
touch .env.example .gitignore docker-compose.yml README.md
```

**Before running:** Why do we need all those `__init__.py` files? What breaks without them?

### Step 3: Python environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 4: Core dependencies

```bash
pip install fastapi uvicorn[standard] pydantic pydantic-settings
pip install httpx  # async HTTP client for model APIs
pip install websockets  # WebSocket support
pip install python-dotenv
pip install aiosqlite  # async SQLite for run persistence
```

**Review question:** Why `httpx` instead of `requests`? This matters for this project specifically — think about what the refinement loop does.

### Step 5: Create requirements.txt

```bash
pip freeze > requirements.txt
```

**Review question:** What's wrong with running `pip freeze` in a virtual environment that also has unrelated packages installed? What's the cleaner alternative?

### Step 6: .gitignore

```
# Python
__pycache__/
*.py[cod]
venv/
.env
*.db

# Node
node_modules/
dist/
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
```

**Review question:** Why is `.env` gitignored but `.env.example` is not?

### Step 7: .env.example

```
# Model API keys (get free accounts)
GROQ_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
GOOGLE_GEMINI_API_KEY=your_key_here

# App config
MAX_ITERATIONS=10
DEFAULT_MODEL=groq/groq-compound-mini
RATE_LIMIT_RPM=30
```

### Step 8: Verify the setup

```bash
# From the backend directory, with venv activated:
python -c "import fastapi; import httpx; import pydantic; print('All imports OK')"
```

---

## Review checkpoint

> **Claude Code:** Ask me these questions. Don't proceed to lesson 01 until I can answer all of them.

1. If someone clones this repo tomorrow, what steps do they follow to get it running? Walk through it.
2. Why did we pick `httpx` over `requests`? (Hint: think about the refinement loop making multiple concurrent API calls.)
3. What would happen if we committed `.env` with real API keys? How would you fix it if someone already did?
4. Look at the directory structure. Why is `engine/` separate from `adapters/`? Could they be one package? What's the argument for keeping them apart?

---

## Challenge

**Before moving to lesson 01**, do this yourself:

1. Create a `backend/app/config.py` that uses `pydantic-settings` to load the `.env` file into a typed `Settings` class. Every config value should have a type and a default.
2. Write a simple test in `backend/tests/test_config.py` that verifies the Settings class loads correctly even when no `.env` file exists (using defaults).

> **Claude Code:** Review my config.py after I write it. Tell me what I got wrong and what edge cases I'm missing. Don't fix it for me — point me at the problem and let me fix it.
