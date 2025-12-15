<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dynamic CPQ Rule Extractor

This project is a React-based application that uses Google Gemini to extract CPQ (Configure, Price, Quote) rules from natural text.

## Run Locally

**Prerequisites:**  Node.js (v18 or v20 recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   Create a `.env` or `.env.local` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   *(Note: You can also use `API_KEY` if preferred)*

3. **Run the app:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 to view it.

## Deploy to Hugging Face Spaces

This project is configured to run on Hugging Face Spaces using Docker.

1. **Create a new Space:**
   - Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **Create new Space**.
   - **Space SDK**: Select **Docker**.
   - **Space Hardware**: CPU Basic (Free) is sufficient.

2. **Add API Key Secret:**
   - Navigate to your Space's **Settings** tab.
   - Scroll to **Variables and secrets**.
   - Click **New secret**.
   - **Name**: `GEMINI_API_KEY` (or `API_KEY`)
   - **Value**: Your Google Gemini API Key.

3. **Deploy Code:**
   You can deploy by pushing this code to the Space's Git repository.
   
   ```bash
   # Initialize git if not already done
   git init
   
   # Add your Space as a remote (copy the command from your Space's "App" page dropdown)
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   
   # Push to the space
   git add .
   git commit -m "Initial commit"
   git push space main
   ```

   *Alternatively, you can manually upload files via the Hugging Face web interface.*
