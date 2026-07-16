# Unified User Registration Portal (React + FastAPI + Power Automate)

This is a unified full-stack registration portal designed to collect user info (Name, Email, and Profile Photo) and forward it to a SharePoint List via a Microsoft Power Automate HTTP trigger. 

**This setup runs both the React Frontend and the FastAPI Backend on a single Web Service on Render using Docker.** The build process compiles the React frontend automatically and serves it via FastAPI.

## Folder Structure

```
├── backend/
│   ├── main.py                  # FastAPI code (validation + static file hosting)
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Template for backend environments
├── frontend/
│   ├── index.html               # Main entry HTML
│   ├── package.json             # Frontend packages
│   ├── vite.config.js           # Vite configuration
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Form component (User Registration)
│       └── index.css            # Custom glassmorphic styling (Indigo-Cyan theme)
├── Dockerfile                   # Builds React and runs FastAPI together
├── render.yaml                  # Render Blueprint definition (Single Web Service)
└── README.md                    # This setup guide
```

---

## 1. How to deploy on Render (Single Web Service)

Deploying a single service is quick and easy:

1. Initialize a Git repository in **this folder** (`user-registration-final`):
   ```bash
   git init
   git add .
   git commit -m "initial commit: unified registration portal"
   ```
2. Create a new repository on your GitHub account and push this code to it:
   ```bash
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git branch -M main
   git push -u origin main
   ```
3. Log into your [Render Dashboard](https://dashboard.render.com).
4. Click **New** -> **Blueprint**.
5. Connect your GitHub repository.
6. Render will automatically parse the `render.yaml` file. You will be prompted to enter:
   - `POWER_AUTOMATE_URL`: Paste the HTTP POST URL copied from Power Automate.
7. Click **Approve**. Render will automatically build the Docker container and start serving the app.
8. Open the single URL provided by Render to access the app!
